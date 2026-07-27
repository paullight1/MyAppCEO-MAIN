import { ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { CrowdfundingService } from './crowdfunding.service';

const originalEnv = process.env;
const originalFetch = global.fetch;

describe('CrowdfundingService app-linked campaigns', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  const createDb = () => {
    const insertedValues: any[] = [];
    const app = { id: 'app-1', ownerId: 'owner-1', name: 'Demo App' };
    const campaign = {
      id: 'campaign-1',
      appId: 'app-1',
      ownerId: 'owner-1',
      title: 'Demo raise',
      slug: 'demo-raise',
      fundingGoal: '5000.00',
      fundingRaised: '0.00',
      minInvestment: '100.00',
      equityOfferedPct: '10.00',
      preMoneyValuation: '50000.00',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
            limit: jest.fn().mockResolvedValue([app]),
          }),
        }),
      }),
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((values: any) => {
          insertedValues.push(values);
          return {
            returning: jest
              .fn()
              .mockResolvedValue(values.campaignId ? [{ id: 'escrow-1', ...values }] : [{ ...campaign, ...values }]),
          };
        }),
      })),
    };

    return { db, insertedValues };
  };

  it('creates a campaign linked to an app owned by the current user', async () => {
    const { db, insertedValues } = createDb();
    const service = new CrowdfundingService(db as any);

    await service.create(
      {
        appId: 'app-1',
        title: 'Demo raise',
        fundingGoal: 5000,
        equityOfferedPct: 10,
        preMoneyValuation: 50000,
      } as any,
      'owner-1',
    );

    expect(insertedValues[0]).toMatchObject({
      appId: 'app-1',
      ownerId: 'owner-1',
      title: 'Demo raise',
    });
  });

  it('rejects app-linked campaign creation for non-owners', async () => {
    const { db } = createDb();
    const service = new CrowdfundingService(db as any);

    await expect(
      service.create(
        {
          appId: 'app-1',
          title: 'Demo raise',
          fundingGoal: 5000,
          equityOfferedPct: 10,
          preMoneyValuation: 50000,
        } as any,
        'other-user',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('initializes Paystack payment for an investment commitment', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_paystack';
    process.env.PAYSTACK_CURRENCY = 'NGN';

    const campaign = {
      id: 'campaign-1',
      ownerId: 'owner-1',
      appId: 'app-1',
      title: 'Demo raise',
      status: 'active',
      fundingGoal: '5000.00',
      fundingRaised: '0.00',
      minInvestment: '100.00',
      maxInvestment: null,
      equityOfferedPct: '10.00',
      preMoneyValuation: '50000.00',
    };
    const commitment = {
      id: 'commitment-1',
      campaignId: 'campaign-1',
      investorId: 'investor-1',
      amount: '1000',
      stakePct: '0.2',
      valuationAtCommitment: '50000.00',
      status: 'pending',
    };
    const user = { id: 'investor-1', email: 'investor@example.com' };
    const selectQueue = [
      { rows: [campaign], limit: false },
      { rows: [], limit: true },
      { rows: [user], limit: true },
    ];
    const updatedValues: any[] = [];

    const db = {
      select: jest.fn().mockImplementation(() => {
        const next = selectQueue.shift();
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue(
              next?.limit
                ? { limit: jest.fn().mockResolvedValue(next.rows) }
                : Promise.resolve(next?.rows || []),
            ),
          }),
        };
      }),
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([commitment]),
        }),
      })),
      update: jest.fn().mockImplementation(() => ({
        set: jest.fn().mockImplementation((values: any) => {
          updatedValues.push(values);
          return { where: jest.fn().mockResolvedValue(undefined) };
        }),
      })),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/test',
          access_code: 'access-code',
          reference: 'PSK_commitment-1',
        },
      }),
    } as any);

    const service = new CrowdfundingService(db as any);
    const result = await service.invest('campaign-1', { amount: 1000, returnUri: 'https://app.test/return' }, 'investor-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/initialize',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_paystack',
        }),
      }),
    );
    expect(result).toMatchObject({
      authorizationUrl: 'https://checkout.paystack.com/test',
      accessCode: 'access-code',
      reference: 'PSK_commitment-1',
      provider: 'paystack',
    });
    expect(updatedValues[0]).toMatchObject({
      status: 'processing',
      stripePaymentIntentId: 'PSK_commitment-1',
    });
  });

  it('does not reapply side effects for an already paid commitment', async () => {
    const paidCommitment = {
      id: 'commitment-1',
      campaignId: 'campaign-1',
      investorId: 'investor-1',
      amount: '1000',
      stakePct: '0.2',
      valuationAtCommitment: '50000.00',
      status: 'paid',
      stripePaymentIntentId: 'simulated_commitment-1',
    };
    const campaign = {
      id: 'campaign-1',
      ownerId: 'owner-1',
      appId: 'app-1',
      title: 'Demo raise',
      status: 'active',
      fundingGoal: '5000.00',
      fundingRaised: '1000.00',
      minInvestment: '100.00',
      equityOfferedPct: '10.00',
      preMoneyValuation: '50000.00',
    };
    const selectQueue = [
      { rows: [paidCommitment], limit: true },
      { rows: [campaign], limit: false },
    ];

    const db = {
      select: jest.fn().mockImplementation(() => {
        const next = selectQueue.shift();
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue(
              next?.limit
                ? { limit: jest.fn().mockResolvedValue(next.rows) }
                : Promise.resolve(next?.rows || []),
            ),
          }),
        };
      }),
      update: jest.fn(),
      insert: jest.fn(),
    };

    const service = new CrowdfundingService(db as any);
    const result = await service.confirmInvestment(
      'campaign-1',
      { commitmentId: 'commitment-1', paymentReference: 'simulated_commitment-1' },
      'investor-1',
    );

    expect(result.success).toBe(true);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects Paystack webhooks with an invalid signature', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_paystack';
    const service = new CrowdfundingService({} as any);
    const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } }));

    await expect(
      service.handlePaystackWebhook(rawBody, 'invalid-signature'),
    ).rejects.toThrow('Paystack webhook signature verification failed');
  });

  it('accepts a signed Paystack webhook and finalizes the referenced commitment', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_paystack';
    const event = {
      event: 'charge.success',
      data: {
        id: 12345,
        status: 'success',
        amount: 100000,
        reference: 'MCEO-commitment-1',
      },
    };
    const rawBody = Buffer.from(JSON.stringify(event));
    const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');
    const commitment = {
      id: 'commitment-1',
      campaignId: 'campaign-1',
      investorId: 'investor-1',
      amount: '1000',
      stakePct: '0.2',
      valuationAtCommitment: '50000.00',
      status: 'processing',
      stripePaymentIntentId: 'MCEO-commitment-1',
    };
    const campaign = {
      id: 'campaign-1',
      ownerId: 'owner-1',
      appId: 'app-1',
      title: 'Demo raise',
      status: 'active',
      fundingGoal: '5000.00',
      fundingRaised: '1000.00',
      minInvestment: '100.00',
      equityOfferedPct: '10.00',
      preMoneyValuation: '50000.00',
    };
    const investor = { id: 'investor-1', email: 'investor@example.com' };
    const selectQueue = [
      { rows: [commitment], limit: true },
      { rows: [campaign], limit: true },
      { rows: [], limit: true },
      { rows: [investor], limit: true },
      { rows: [], limit: true },
      { rows: [campaign], limit: false },
    ];
    const updatedValues: any[] = [];
    const insertedValues: any[] = [];
    const db = {
      select: jest.fn().mockImplementation(() => {
        const next = selectQueue.shift();
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue(
              next?.limit
                ? { limit: jest.fn().mockResolvedValue(next.rows) }
                : Promise.resolve(next?.rows || []),
            ),
          }),
        };
      }),
      update: jest.fn().mockImplementation(() => ({
        set: jest.fn().mockImplementation((values: any) => {
          updatedValues.push(values);
          return {
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ ...commitment, ...values }]),
            }),
          };
        }),
      })),
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((values: any) => {
          insertedValues.push(values);
          return { returning: jest.fn().mockResolvedValue([values]) };
        }),
      })),
    };

    const service = new CrowdfundingService(db as any);
    const result = await service.handlePaystackWebhook(rawBody, signature);

    expect(result).toMatchObject({ received: true, finalized: true });
    expect(updatedValues[0]).toMatchObject({
      status: 'paid',
      stripePaymentIntentId: 'MCEO-commitment-1',
      stripeChargeId: '12345',
    });
    expect(insertedValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          appId: 'app-1',
          userId: 'investor-1',
          role: 'shareholder',
        }),
      ]),
    );
  });
});
