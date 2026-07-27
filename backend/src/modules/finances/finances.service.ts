import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { appInvestmentHoldings, apps } from '../../database/schema';

interface FinanceSummary {
  month: string;
  revenue: number;
  expenses: number;
}

@Injectable()
export class FinancesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async getDashboard(userId: string) {
    const ownedApps = await this.db.select().from(apps).where(eq(apps.ownerId, userId));
    const holdingRows = await this.db
      .select({
        holding: appInvestmentHoldings,
        app: apps,
      })
      .from(appInvestmentHoldings)
      .leftJoin(apps, eq(appInvestmentHoldings.appId, apps.id))
      .where(eq(appInvestmentHoldings.investorId, userId));

    const totalRevenue = ownedApps.reduce(
      (sum: number, app: any) => sum + this.toNumber(app.monthlyRevenue),
      0,
    );

    const stakes = holdingRows.map((row: any) => {
      const holding = row.holding;
      const app = row.app || {};
      const ownershipPercentage = this.toNumber(holding.stakePct);
      const estimatedValue = this.toNumber(app.estimatedValue);
      const amountInvested = this.toNumber(holding.amount);
      const currentValue = estimatedValue > 0
        ? Math.round(estimatedValue * (ownershipPercentage / 100) * 100) / 100
        : amountInvested;

      return {
        id: holding.id,
        userId: holding.investorId,
        listingId: holding.appId,
        ownershipPercentage,
        amountInvested,
        currentValue,
        totalDividends: 0,
        acquiredAt: this.toIsoString(holding.acquiredAt),
        listing: {
          name: app.name || 'Unknown app',
          category: app.category || 'App',
          monthlyRevenue: this.toNumber(app.monthlyRevenue),
        },
      };
    });

    const portfolioValue = stakes.reduce((sum: number, stake: any) => sum + stake.currentValue, 0);

    return {
      summary: this.buildSummary(totalRevenue),
      stakes,
      metrics: {
        totalRevenue,
        totalRevenueChange: 0,
        portfolioValue,
        portfolioValueChange: 0,
        netProfit: totalRevenue,
        netProfitChange: 0,
        dividendsEarned: 0,
        dividendsEarnedChange: 0,
      },
      revenueBySource: this.buildRevenueBySource(ownedApps, totalRevenue),
    };
  }

  private buildSummary(totalRevenue: number): FinanceSummary[] {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
      return {
        month: date.toISOString().slice(0, 7),
        revenue: index === 5 ? totalRevenue : 0,
        expenses: 0,
      };
    });
  }

  private buildRevenueBySource(ownedApps: any[], totalRevenue: number) {
    const grouped = new Map<string, number>();

    for (const app of ownedApps) {
      const source = app.category || 'Apps';
      grouped.set(source, (grouped.get(source) || 0) + this.toNumber(app.monthlyRevenue));
    }

    return Array.from(grouped.entries())
      .filter(([, value]) => value > 0)
      .map(([source, value]) => ({
        source,
        value,
        pct: totalRevenue > 0 ? Math.round((value / totalRevenue) * 10000) / 100 : 0,
      }));
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toIsoString(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return new Date().toISOString();
  }
}
