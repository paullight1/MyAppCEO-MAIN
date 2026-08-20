import { ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

const listing = {
  id: 'listing-1',
  appId: 'app-1',
  sellerId: 'owner-user',
  storeMetadata: {},
  monthlyRevenue: '0',
  revenueVerified: false,
};

const createDb = (ownedListing = listing) => {
  const limit = jest.fn().mockResolvedValue([ownedListing]);
  const whereSelect = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where: whereSelect });

  const returning = jest.fn().mockResolvedValue([
    { ...ownedListing, revenueVerified: true, monthlyRevenue: '125.50' },
  ]);
  const whereUpdate = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where: whereUpdate });

  return {
    db: {
      select: jest.fn().mockReturnValue({ from }),
      update: jest.fn().mockReturnValue({ set }),
    },
    set,
  };
};

const createStripe = () => ({
  payouts: {
    list: jest.fn().mockResolvedValue({ data: [] }),
  },
});

const createService = (db: any, stripe: ReturnType<typeof createStripe>) =>
  new PaymentsService(
    stripe as any,
    { from: jest.fn() } as any,
    db as any,
  );

describe('PaymentsService revenue verification security', () => {
  it('rejects verification when the authenticated user does not own the listing', async () => {
    const { db } = createDb();
    const stripe = createStripe();
    const service = createService(db, stripe);

    await expect(
      service.verifyRevenue('listing-1', 'attacker-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(stripe.payouts.list).not.toHaveBeenCalled();
  });

  it('uses server-owned subscription evidence instead of caller-selected Stripe payouts', async () => {
    const { db, set } = createDb();
    const stripe = createStripe();
    const service = createService(db, stripe);

    jest.spyOn(service, 'getConnectStatus').mockResolvedValue({
      provider: 'stripe',
      connected: true,
      accountId: 'acct_owner',
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      providerAvailable: true,
      requirementsDue: [],
    } as any);
    jest.spyOn(service, 'getSubscriptionSummary').mockResolvedValue({
      activeSubscriptions: 2,
      byCurrency: [
        {
          currency: 'usd',
          totalMrrMinor: 12550,
          totalMrr: 125.5,
          activeSubscriptions: 2,
        },
      ],
    });

    const result = await service.verifyRevenue('listing-1', 'owner-user');

    expect(stripe.payouts.list).not.toHaveBeenCalled();
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
    const { db, set } = createDb();
    const stripe = createStripe();
    const service = createService(db, stripe);

    jest.spyOn(service, 'getConnectStatus').mockResolvedValue({
      provider: 'stripe',
      connected: true,
      accountId: 'acct_owner',
      onboardingComplete: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      providerAvailable: true,
      requirementsDue: [],
    } as any);
    jest.spyOn(service, 'getSubscriptionSummary').mockResolvedValue({
      activeSubscriptions: 2,
      byCurrency: [
        { currency: 'usd', totalMrrMinor: 10000, totalMrr: 100, activeSubscriptions: 1 },
        { currency: 'ngn', totalMrrMinor: 500000, totalMrr: 5000, activeSubscriptions: 1 },
      ],
    });

    const result = await service.verifyRevenue('listing-1', 'owner-user');

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
