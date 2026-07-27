import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { StripeConnectorService } from './stripe-connector.service';

jest.mock('stripe', () => jest.fn());

const StripeMock = Stripe as unknown as jest.Mock;

describe('StripeConnectorService', () => {
  const originalEnv = process.env;
  let subscriptionsList: jest.Mock;
  let balanceTransactionsList: jest.Mock;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = 'sk_test_real';
    subscriptionsList = jest.fn();
    balanceTransactionsList = jest.fn();
    StripeMock.mockReset();
    StripeMock.mockImplementation(() => ({
      subscriptions: { list: subscriptionsList },
      balanceTransactions: { list: balanceTransactionsList },
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not initialize Stripe and rejects when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const service = new StripeConnectorService();

    expect(StripeMock).not.toHaveBeenCalled();
    await expect(service.fetchFinancials('acct_123')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not initialize Stripe and rejects when STRIPE_SECRET_KEY is a placeholder', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';

    const service = new StripeConnectorService();

    expect(StripeMock).not.toHaveBeenCalled();
    await expect(service.fetchFinancials('acct_123')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects when connectedAccountId is missing', async () => {
    const service = new StripeConnectorService();

    await expect(service.fetchFinancials('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('fetches financials from Stripe for the connected account', async () => {
    subscriptionsList.mockResolvedValue({
      data: [
        {
          items: {
            data: [
              {
                quantity: 2,
                price: {
                  unit_amount: 5000,
                  recurring: { interval: 'month', interval_count: 1 },
                  currency: 'usd',
                },
              },
            ],
          },
        },
        {
          items: {
            data: [
              {
                quantity: 1,
                price: {
                  unit_amount: 120000,
                  recurring: { interval: 'year', interval_count: 1 },
                  currency: 'usd',
                },
              },
            ],
          },
        },
      ],
    });
    balanceTransactionsList.mockResolvedValue({
      data: [
        { net: 250000, currency: 'usd' },
        { net: -50000, currency: 'usd' },
      ],
    });

    const service = new StripeConnectorService();
    const result = await service.fetchFinancials('acct_123');

    expect(subscriptionsList).toHaveBeenCalledWith(
      { status: 'active', limit: 100, expand: ['data.items.data.price'] },
      { stripeAccount: 'acct_123' },
    );
    expect(balanceTransactionsList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
      { stripeAccount: 'acct_123' },
    );
    expect(result).toMatchObject({
      mrr: 200,
      activeSubscriptions: 2,
      netRevenue7d: 2000,
      currency: 'usd',
    });
    expect(Date.parse(result.lastSync)).not.toBeNaN();
  });

  it('throws ServiceUnavailableException when Stripe calls fail', async () => {
    subscriptionsList.mockRejectedValue(new Error('stripe unavailable'));

    const service = new StripeConnectorService();

    await expect(service.fetchFinancials('acct_123')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
