import { ForbiddenException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { appCoowners, apps, appMetrics } from '../../database/schema';
import { and, eq, desc } from 'drizzle-orm';
import { DashboardOverview } from '../../../../packages/types/src';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class TelemetryService {
  private readonly overviewCacheTtlSeconds = 60;

  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly cacheService: CacheService,
  ) {}

  async getAppOverview(appId: string, userId: string): Promise<DashboardOverview> {
    const app = await this.findAccessibleApp(appId, userId);

    return this.cacheService.wrap(
      `analytics:overview:${appId}`,
      this.overviewCacheTtlSeconds,
      () => this.getFreshAppOverview(app),
    );
  }

  private async findAccessibleApp(appId: string, userId: string) {
    const [app] = await this.db.select().from(apps).where(eq(apps.id, appId)).limit(1);

    if (!app) {
      throw new NotFoundException(`App with ID ${appId} not found`);
    }

    if (app.ownerId === userId) {
      return app;
    }

    const [coowner] = await this.db
      .select({ id: appCoowners.id })
      .from(appCoowners)
      .where(and(
        eq(appCoowners.appId, appId),
        eq(appCoowners.userId, userId),
        eq(appCoowners.status, 'accepted'),
      ))
      .limit(1);

    if (!coowner) {
      throw new ForbiddenException('You do not have access to this app analytics');
    }

    return app;
  }

  private async getFreshAppOverview(app: any): Promise<DashboardOverview> {
    const appId = app.id;

    // Aggregate from app_metrics table (simulating real-time telemetry)
    const [latestMetrics] = await this.db
      .select()
      .from(appMetrics)
      .where(eq(appMetrics.appId, appId))
      .orderBy(desc(appMetrics.date))
      .limit(1);

    const mrr = parseFloat(app.monthlyRevenue || '0');
    const dau = latestMetrics?.dau || 0;
    const mau = app.monthlyUsers || 0;

    // Logic: Valuation = (Monthly Revenue * 12) * Multiple (e.g. 4x)
    const annualRevenue = mrr * 12;
    const multiple = 4.5; // Base multiple
    const valuation = annualRevenue * multiple;

    return {
      mrr: {
        value: mrr,
        change: 12.5, // Mocked growth change
      },
      users: {
        dau,
        mau,
        growth: 8.2,
      },
      valuation: {
        current: valuation,
        multiple,
      },
    };
  }
}
