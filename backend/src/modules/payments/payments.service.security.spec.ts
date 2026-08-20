import { ForbiddenException } from '@nestjs/common';
import { RevenueVerificationService } from './revenue-verification.service';

const listing = {
  id: 'listing-1',
  appId: 'app-1',
  sellerId: 'owner-user',
  storeMetadata: {},
  monthlyRevenue: '0',
  revenueVerified: false,
};

const createDb = (
  ownedListing = listing,
  summaryRows: any[] = [],
) => {
  const listingLimit = jest.fn().mockResolvedValue([ownedListing]);
  const listingWhere = jest.fn().mockReturnValue({ limit: listingLimit });
  const listingFrom = jest.fn().mockReturnValue({ where: listingWhere });

  const summaryGroupBy = jest.fn().mockResolvedValue(summaryRows);
  const summaryWhere = jest.fn().mockReturnValue({ groupBy: summaryGroupBy });
  const summaryFrom = jest.fn().mockReturnValue({ where: summaryWhere });

  const select = jest
    .fn()
    .mockReturnValueOnce({ from: listingFrom })
    .mockReturnValueOnce({ from: summaryFrom });

  const returning = jest.fn().mockResolvedValue([
    { ...ownedListing, revenueVerified: true, monthlyRevenue: '125.50' },
  ]);
  const whereUpdate = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where: whereUpdate });

  return {
    db: {
      select,
      update: jest.fn().mockReturnValue({ set }),
    },
    set,
  };
};

const createPaymentsService = () => ({
  getConnectStatus: jest.fn().mockResolvedValue({
    provider: 'stripe',
    connected: true,
    accountId: 'acct_owner',
    onboardingComplete: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    providerAvailable: true,
    requirementsDue: [],
  }),
});

describe('RevenueVerificationService security', () => {
  it('rejects verification when the authenticated user does not own the listing', async () => {
    const { db } = createDb();
    const payments = createPaymentsService();
    const service = new RevenueVerificationService(payments as any, db as any);

    await expect(
      service.verifyListingRevenue('listing-1', 'attacker-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(payments.getConnectStatus).not.toHaveBeenCalled();
  });

  it('persists MRR only from server-bound active subscription evidence', async () => {
    const { db, set } = createDb(listing, [
      {
        currency: 'usd',
        totalMrrMinor: 12550,
        activeSubscriptions: 2,
      },
    ]);
    const payments = createPaymentsService();
    const service = new RevenueVerificationService(payments as any, db as any);

    const result = await service.verifyListingRevenue('listing-1', 'owner-user');

    expect(payments.getConnectStatus).toHaveBeenCalledWith('owner-user');
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        revenueVerified: true,
        monthlyRevenue: '125.5',
      }),
    );
    expect(result).toMatchObject({
      verified: true,
      mrr: 125.5,
      currency: 'usd',
      activeSubscriptions: 2,
      source: 'stripe_subscriptions',
    });
  });

  it('does not combine different currencies into a single verified MRR', async () => {
    const { db, set } = createDb(listing, [
      { currency: 'usd', totalMrrMinor: 10000, activeSubscriptions: 1 },
      { currency: 'ngn', totalMrrMinor: 500000, activeSubscriptions: 1 },
    ]);
    const payments = createPaymentsService();
    const service = new RevenueVerificationService(payments as any, db as any);

    const result = await service.verifyListingRevenue('listing-1', 'owner-user');

    expect(result).toMatchObject({
      verified: false,
      status: 'needs_more_info',
      reason: 'multiple_currencies',
    });
    expect(set).not.toHaveBeenCalledWith(
      expect.objectContaining({ revenueVerified: true }),
    );
  });
});
