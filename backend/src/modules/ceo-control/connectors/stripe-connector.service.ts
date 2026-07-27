import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeConnectorService {
  private readonly logger = new Logger(StripeConnectorService.name);
  private readonly stripe?: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!this.isUsableSecretKey(secretKey)) {
      return;
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  /**
   * Fetches real-time MRR and revenue data from Stripe for a connected account
   */
  async fetchFinancials(connectedAccountId: string) {
    const stripeAccount = connectedAccountId?.trim();
    if (!stripeAccount) {
      throw new BadRequestException('Stripe connected account id is required');
    }

    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe connector is not configured',
      );
    }

    try {
      const sevenDaysAgo = Math.floor(
        (Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
      );
      const [subscriptions, balanceTransactions] = await Promise.all([
        this.stripe.subscriptions.list(
          { status: 'active', limit: 100, expand: ['data.items.data.price'] },
          { stripeAccount },
        ),
        this.stripe.balanceTransactions.list(
          { limit: 100, created: { gte: sevenDaysAgo } },
          { stripeAccount },
        ),
      ]);

      const mrr = subscriptions.data.reduce(
        (total, subscription) =>
          total + this.subscriptionMonthlyRevenue(subscription),
        0,
      );
      const netRevenue7d = balanceTransactions.data.reduce(
        (total, transaction) => total + transaction.net / 100,
        0,
      );
      const currency =
        balanceTransactions.data[0]?.currency ||
        this.subscriptionCurrency(subscriptions.data[0]) ||
        'usd';

      return {
        mrr: this.roundCurrency(mrr),
        activeSubscriptions: subscriptions.data.length,
        netRevenue7d: this.roundCurrency(netRevenue7d),
        currency,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch Stripe financials for ${stripeAccount}`,
        error,
      );
      throw new ServiceUnavailableException(
        'Could not fetch Stripe financials',
      );
    }
  }

  private isUsableSecretKey(
    secretKey: string | undefined,
  ): secretKey is string {
    return Boolean(secretKey && secretKey !== 'sk_test_placeholder');
  }

  private subscriptionMonthlyRevenue(
    subscription: Stripe.Subscription,
  ): number {
    return subscription.items.data.reduce((total, item) => {
      const price = item.price;
      const amount = this.priceUnitAmount(price);
      const quantity = item.quantity || 1;
      const interval = price.recurring?.interval;
      const intervalCount = price.recurring?.interval_count || 1;

      if (!interval || amount === null) {
        return total;
      }

      return (
        total + this.toMonthlyAmount(amount, interval, intervalCount) * quantity
      );
    }, 0);
  }

  private subscriptionCurrency(
    subscription: Stripe.Subscription | undefined,
  ): string | undefined {
    return subscription?.items.data.find((item) => item.price.currency)?.price
      .currency;
  }

  private priceUnitAmount(price: Stripe.Price): number | null {
    if (typeof price.unit_amount === 'number') {
      return price.unit_amount / 100;
    }

    if (price.unit_amount_decimal) {
      return Number(price.unit_amount_decimal) / 100;
    }

    return null;
  }

  private toMonthlyAmount(
    amount: number,
    interval: Stripe.Price.Recurring.Interval,
    intervalCount: number,
  ): number {
    switch (interval) {
      case 'day':
        return (amount * 365) / 12 / intervalCount;
      case 'week':
        return (amount * 52) / 12 / intervalCount;
      case 'month':
        return amount / intervalCount;
      case 'year':
        return amount / 12 / intervalCount;
      default:
        return 0;
    }
  }

  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
