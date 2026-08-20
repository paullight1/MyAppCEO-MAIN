import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { listings, stripeSubscriptions } from '../../database/schema';
import { PaymentsService } from './payments.service';

const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

@Injectable()
export class RevenueVerificationService {
  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  /**
   * Compatibility path for clients that historically keyed revenue verification
   * by app id. The listing is resolved using BOTH app id and authenticated seller
   * id before entering the canonical listing verification flow.
   */
  async verifyOwnedAppRevenue(appId: string, userId: string) {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.appId, appId), eq(listings.sellerId, userId)))
      .limit(1);

    if (!listing) {
      throw new NotFoundException('Owned listing for app not found');
    }

    return this.verifyListingRevenue(listing.id, userId);
  }

  async verifyListingRevenue(listingId: string, userId: string) {
    const listing = await this.findOwnedListingOrThrow(listingId, userId);

    if (!listing.appId) {
      return this.persistUnverified(listing, userId, 'listing_not_linked_to_app');
    }

    const connect = await this.paymentsService.getConnectStatus(userId);
    if (!connect.connected || !connect.accountId) {
      return this.persistUnverified(listing, userId, 'stripe_connect_missing');
    }
    if (!connect.onboardingComplete || !connect.payoutsEnabled) {
      return this.persistUnverified(listing, userId, 'stripe_connect_incomplete');
    }

    // Revenue is derived from webhook-ingested subscription state that is
    // simultaneously bound to this seller, this listing's app, and the
    // server-owned connected account. The client cannot select any of these
    // trust identifiers.
    const rows = await this.db
      .select({
        currency: stripeSubscriptions.currency,
        totalMrrMinor: sql<number>`COALESCE(SUM(${stripeSubscriptions.mrrAmount}), 0)`,
        activeSubscriptions: sql<number>`COUNT(*)`,
      })
      .from(stripeSubscriptions)
      .where(and(
        eq(stripeSubscriptions.userId, userId),
        eq(stripeSubscriptions.appId, listing.appId),
        eq(stripeSubscriptions.connectedAccountId, connect.accountId),
        eq(stripeSubscriptions.status, 'active' as any),
      ))
      .groupBy(stripeSubscriptions.currency);

    const positiveRows = rows
      .map((row: any) => ({
        currency: String(row.currency || '').toLowerCase(),
        totalMrrMinor: Number(row.totalMrrMinor) || 0,
        activeSubscriptions: Number(row.activeSubscriptions) || 0,
      }))
      .filter((row: any) => row.currency && row.totalMrrMinor > 0 && row.activeSubscriptions > 0);

    if (positiveRows.length === 0) {
      return this.persistUnverified(listing, userId, 'no_active_subscription_evidence');
    }

    if (positiveRows.length !== 1) {
      return this.persistUnverified(listing, userId, 'multiple_currencies', {
        currencies: positiveRows.map((row: any) => row.currency),
      });
    }

    const evidence = positiveRows[0];
    const divisor = ZERO_DECIMAL_CURRENCIES.has(evidence.currency) ? 1 : 100;
    const mrr = Number((evidence.totalMrrMinor / divisor).toFixed(2));
    const verifiedAt = new Date().toISOString();
    const metadata = this.toRecord(listing.storeMetadata);

    await this.db
      .update(listings)
      .set({
        revenueVerified: true,
        monthlyRevenue: String(mrr),
        storeMetadata: {
          ...metadata,
          revenueVerification: {
            status: 'verified',
            source: 'stripe_subscriptions',
            currency: evidence.currency,
            totalMrrMinor: evidence.totalMrrMinor,
            activeSubscriptions: evidence.activeSubscriptions,
            connectedAccountId: connect.accountId,
            verifiedAt,
          },
        },
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, listing.id), eq(listings.sellerId, userId)))
      .returning();

    return {
      verified: true,
      status: 'approved' as const,
      mrr,
      revenue: mrr,
      currency: evidence.currency,
      activeSubscriptions: evidence.activeSubscriptions,
      source: 'stripe_subscriptions' as const,
      verifiedAt,
    };
  }

  private async findOwnedListingOrThrow(listingId: string, userId: string) {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    return listing;
  }

  private async persistUnverified(
    listing: any,
    userId: string,
    reason: string,
    details: Record<string, unknown> = {},
  ) {
    const updatedAt = new Date().toISOString();
    const metadata = this.toRecord(listing.storeMetadata);

    await this.db
      .update(listings)
      .set({
        revenueVerified: false,
        storeMetadata: {
          ...metadata,
          revenueVerification: {
            ...this.toRecord(metadata.revenueVerification),
            status: 'needs_more_info',
            source: 'stripe_subscriptions',
            reason,
            ...details,
            updatedAt,
          },
        },
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, listing.id), eq(listings.sellerId, userId)))
      .returning();

    return {
      verified: false,
      status: 'needs_more_info' as const,
      reason,
      source: 'stripe_subscriptions' as const,
      ...details,
    };
  }

  private toRecord(value: unknown): Record<string, any> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed && !Array.isArray(parsed)
          ? parsed as Record<string, any>
          : {};
      } catch {
        return {};
      }
    }
    return {};
  }
}
