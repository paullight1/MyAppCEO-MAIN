import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { gunzipSync } from 'zlib';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { appStoreConnections, appStoreMetrics } from '../../database/schema';
import { AppStoreService } from './app-store.service';

const ASC_BASE = 'https://api.appstoreconnect.apple.com/v1';
const ITUNES_LOOKUP = 'https://itunes.apple.com/lookup';

interface AppleApp {
  appleId: string;
  name: string | null;
  bundleId: string | null;
  sku: string | null;
}

interface SalesRow {
  units: number;
  proceedsByCurrency: Record<string, number>;
}

export interface AppStoreMetricSnapshot {
  appleAppId: string;
  appleAppName: string | null;
  bundleId: string | null;
  metricDate: string;
  downloads: number | null;
  proceedsAmount: string | null;
  proceedsCurrency: string | null;
  ratingAverage: string | null;
  ratingCount: number | null;
}

@Injectable()
export class AppStoreMetricsService {
  private readonly logger = new Logger(AppStoreMetricsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly appStore: AppStoreService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Pull the latest App Store metrics for every Apple app under the connected
   * key and upsert a daily snapshot per app. Uses the app's stored key via
   * AppStoreService.getAccessTokenForApp — the private key never leaves here.
   */
  async syncMetrics(appId: string, userId: string): Promise<AppStoreMetricSnapshot[]> {
    // getConnection asserts ownership and returns the (secret-free) connection.
    const connection = await this.appStore.getConnection(appId, userId);
    if (!connection) {
      throw new BadRequestException('App Store Connect is not connected for this app');
    }

    const token = await this.appStore.getAccessTokenForApp(appId);
    const apps = await this.fetchApps(token);
    if (apps.length === 0) return [];

    // Ratings (public iTunes lookup) and sales (ASC report) are both batched:
    // one lookup for all apps, one sales report covering the whole vendor.
    const ratings = await this.fetchRatings(apps.map((a) => a.appleId));

    let salesByApple: Record<string, SalesRow> = {};
    let metricDate = this.todayUtc();
    if (connection.vendorNumber) {
      const sales = await this.fetchLatestSales(token, connection.vendorNumber);
      if (sales) {
        salesByApple = sales.byApple;
        metricDate = sales.date;
      }
    }

    const now = new Date();
    const snapshots: AppStoreMetricSnapshot[] = [];

    for (const app of apps) {
      const sale = salesByApple[app.appleId];
      const rating = ratings[app.appleId];
      const { amount, currency } = this.pickProceeds(sale);

      const row = {
        appId,
        appleAppId: app.appleId,
        appleAppName: app.name,
        bundleId: app.bundleId,
        metricDate,
        downloads: sale ? sale.units : null,
        proceedsAmount: amount,
        proceedsCurrency: currency,
        ratingAverage: rating ? rating.average.toFixed(2) : null,
        ratingCount: rating ? rating.count : null,
        raw: { sale: sale ?? null, rating: rating ?? null } as any,
        updatedAt: now,
      };

      await this.db
        .insert(appStoreMetrics)
        .values(row)
        .onConflictDoUpdate({
          target: [
            appStoreMetrics.appId,
            appStoreMetrics.appleAppId,
            appStoreMetrics.metricDate,
          ],
          set: {
            appleAppName: row.appleAppName,
            bundleId: row.bundleId,
            downloads: row.downloads,
            proceedsAmount: row.proceedsAmount,
            proceedsCurrency: row.proceedsCurrency,
            ratingAverage: row.ratingAverage,
            ratingCount: row.ratingCount,
            raw: row.raw,
            updatedAt: now,
          },
        });

      snapshots.push({
        appleAppId: app.appleId,
        appleAppName: app.name,
        bundleId: app.bundleId,
        metricDate,
        downloads: row.downloads,
        proceedsAmount: row.proceedsAmount,
        proceedsCurrency: row.proceedsCurrency,
        ratingAverage: row.ratingAverage,
        ratingCount: row.ratingCount,
      });
    }

    // Refresh the connection's cached metadata.
    await this.db
      .update(appStoreConnections)
      .set({ status: 'connected', appCount: apps.length, lastSyncedAt: now, updatedAt: now })
      .where(eq(appStoreConnections.appId, appId));

    return snapshots;
  }

  /** Read stored metrics for an app (most recent first). */
  async getMetrics(
    appId: string,
    userId: string,
    limit = 90,
  ): Promise<any[]> {
    // Asserts ownership (throws if the caller doesn't own the app).
    await this.appStore.getConnection(appId, userId);
    return this.db
      .select()
      .from(appStoreMetrics)
      .where(eq(appStoreMetrics.appId, appId))
      .orderBy(desc(appStoreMetrics.metricDate))
      .limit(limit);
  }

  // ─── Apple: apps list ────────────────────────────────────────────────────

  private async fetchApps(token: string): Promise<AppleApp[]> {
    const res = await fetch(`${ASC_BASE}/apps?limit=200&fields[apps]=name,bundleId,sku`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Failed to list apps (${res.status}): ${body}`);
      throw new BadRequestException('Could not read your apps from App Store Connect.');
    }
    const json: any = await res.json().catch(() => ({}));
    const data: any[] = Array.isArray(json?.data) ? json.data : [];
    return data.map((d) => ({
      appleId: String(d.id),
      name: d.attributes?.name ?? null,
      bundleId: d.attributes?.bundleId ?? null,
      sku: d.attributes?.sku ?? null,
    }));
  }

  // ─── Ratings (public iTunes lookup) ───────────────────────────────────────

  /**
   * Aggregate star rating + count per app. The App Store Connect API has no
   * stable aggregate-rating endpoint, so we use the public iTunes lookup, which
   * returns averageUserRating/userRatingCount for the queried storefront.
   */
  private async fetchRatings(
    appleIds: string[],
  ): Promise<Record<string, { average: number; count: number }>> {
    const out: Record<string, { average: number; count: number }> = {};
    if (appleIds.length === 0) return out;
    try {
      const res = await fetch(`${ITUNES_LOOKUP}?id=${appleIds.join(',')}&country=us`);
      if (!res.ok) return out;
      const json: any = await res.json().catch(() => ({}));
      for (const r of json?.results ?? []) {
        const id = String(r.trackId ?? '');
        if (!id) continue;
        out[id] = {
          average: Number(r.averageUserRating ?? 0),
          count: Number(r.userRatingCount ?? 0),
        };
      }
    } catch (err: any) {
      this.logger.warn(`iTunes rating lookup failed: ${err?.message}`);
    }
    return out;
  }

  // ─── Sales reports (gzip TSV) ─────────────────────────────────────────────

  /**
   * Fetch the most recent available DAILY SALES SUMMARY report. Reports lag a
   * day or two, so we walk back up to 4 days and use the first one Apple has
   * ready. Returns units + proceeds grouped by Apple Identifier.
   */
  private async fetchLatestSales(
    token: string,
    vendorNumber: string,
  ): Promise<{ date: string; byApple: Record<string, SalesRow> } | null> {
    for (let back = 1; back <= 4; back++) {
      const date = this.dateUtc(-back);
      const params = new URLSearchParams({
        'filter[frequency]': 'DAILY',
        'filter[reportType]': 'SALES',
        'filter[reportSubType]': 'SUMMARY',
        'filter[vendorNumber]': vendorNumber,
        'filter[version]': '1_0',
        'filter[reportDate]': date,
      });

      let res: Response;
      try {
        res = await fetch(`${ASC_BASE}/salesReports?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/a-gzip, application/json',
          },
        });
      } catch (err: any) {
        this.logger.warn(`Sales report request failed for ${date}: ${err?.message}`);
        continue;
      }

      // 404 = no report for that date yet; try an earlier day.
      if (res.status === 404) continue;
      if (!res.ok) {
        this.logger.warn(`Sales report ${date} returned ${res.status}`);
        continue;
      }

      try {
        const buf = Buffer.from(await res.arrayBuffer());
        const tsv = gunzipSync(buf).toString('utf8');
        return { date, byApple: this.parseSalesTsv(tsv) };
      } catch (err: any) {
        this.logger.warn(`Failed to decode sales report ${date}: ${err?.message}`);
        continue;
      }
    }
    return null;
  }

  /** Parse an App Store Connect SALES SUMMARY TSV into per-Apple-app totals. */
  private parseSalesTsv(tsv: string): Record<string, SalesRow> {
    const out: Record<string, SalesRow> = {};
    const lines = tsv.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) return out;

    const header = lines[0].split('\t');
    const col = (name: string) => header.indexOf(name);
    const iUnits = col('Units');
    const iProceeds = col('Developer Proceeds');
    const iCurrency = col('Currency of Proceeds');
    const iAppleId = col('Apple Identifier');
    if (iUnits < 0 || iAppleId < 0) return out;

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('\t');
      const appleId = cells[iAppleId]?.trim();
      if (!appleId) continue;

      const units = parseInt(cells[iUnits] ?? '0', 10) || 0;
      const perUnit = iProceeds >= 0 ? parseFloat(cells[iProceeds] ?? '0') || 0 : 0;
      const currency = iCurrency >= 0 ? (cells[iCurrency]?.trim() || 'USD') : 'USD';

      const entry = (out[appleId] ??= { units: 0, proceedsByCurrency: {} });
      entry.units += units;
      // "Developer Proceeds" is per unit; revenue for the row = units * perUnit.
      entry.proceedsByCurrency[currency] =
        (entry.proceedsByCurrency[currency] ?? 0) + units * perUnit;
    }
    return out;
  }

  /**
   * Reduce a per-currency proceeds map to a single amount + currency. Picks the
   * currency with the largest total; mixed-currency detail is preserved in the
   * stored `raw` payload.
   */
  private pickProceeds(sale?: SalesRow): { amount: string | null; currency: string | null } {
    if (!sale) return { amount: null, currency: null };
    const entries = Object.entries(sale.proceedsByCurrency);
    if (entries.length === 0) return { amount: null, currency: null };
    entries.sort((a, b) => b[1] - a[1]);
    const [currency, amount] = entries[0];
    return { amount: amount.toFixed(2), currency };
  }

  // ─── Date helpers (UTC) ───────────────────────────────────────────────────

  private todayUtc(): string {
    return this.dateUtc(0);
  }

  private dateUtc(offsetDays: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }
}
