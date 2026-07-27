import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.provider';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';
import { SupabaseClient } from '@supabase/supabase-js';
import { DRIZZLE } from '../../database/database.module';
import {
  investmentCommitments,
  crowdfundingCampaigns,
  escrowAccounts,
  listings,
  users,
  apps,
  stripeDisputes,
  stripeSubscriptions,
  } from '../../database/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  // One or more signing secrets. Stripe Connect events are often delivered to a
  // separate webhook endpoint with its own secret, so we accept both and try
  // each when verifying the signature.
  private readonly webhookSecrets: string[];

  constructor(
    @Inject(STRIPE_CLIENT) private stripe: Stripe,
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
    @Inject(DRIZZLE) private db: any,
  ) {
    this.webhookSecrets = [
      process.env.STRIPE_WEBHOOK_SECRET,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    ].filter((secret): secret is string => Boolean(secret));

    if (this.webhookSecrets.length === 0) {
      this.logger.warn(
        'No STRIPE_WEBHOOK_SECRET / STRIPE_CONNECT_WEBHOOK_SECRET set — webhook signature verification will fail',
      );
    }
  }

  async handleWebhook(rawBody: Buffer | undefined, stripeSignature: string) {
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    if (this.webhookSecrets.length === 0) {
      this.logger.error('Webhook received but no signing secret is configured');
      throw new BadRequestException('Webhook signature verification failed');
    }

    let event: Stripe.Event | null = null;
    let lastError: string | undefined;

    for (const secret of this.webhookSecrets) {
      try {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          stripeSignature,
          secret,
        );
        break;
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    if (!event) {
      this.logger.error(`Webhook signature verification failed: ${lastError}`);
      throw new BadRequestException('Webhook signature verification failed');
    }

    this.logger.log(`Processing Stripe webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentPaymentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        // ── Connected-account lifecycle (Stripe Connect) ──────────────────
        case 'account.updated':
          await this.handleConnectAccountUpdated(
            event.data.object as Stripe.Account,
          );
          break;

        case 'account.application.deauthorized':
          await this.handleConnectAccountDeauthorized(event.account ?? null);
          break;

        case 'charge.dispute.created':
        case 'charge.dispute.updated':
        case 'charge.dispute.closed':
          await this.handleChargeDispute(
            event.data.object as Stripe.Dispute,
            event.account ?? null,
          );
          break;

        // ── Subscription lifecycle (for stored MRR) ───────────────────────
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionEvent(
            event.data.object as Stripe.Subscription,
            event.account ?? null,
          );
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (err: any) {
      this.logger.error(
        `Error processing webhook event ${event.type}: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException('Webhook processing failed');
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const { commitmentId, campaignId, investorId, stakePct } =
      paymentIntent.metadata || {};

    if (!commitmentId || !campaignId) {
      this.logger.warn(
        'payment_intent.succeeded missing commitmentId or campaignId metadata',
        { metadata: paymentIntent.metadata },
      );
      return;
    }

    const chargeId =
      typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : null;

    const { commitment, campaign } = await this.runInTransaction(async (tx) => {
      const finalizedRows = await tx
        .update(investmentCommitments)
        .set({
          status: 'paid',
          paidAt: new Date(),
          stripeChargeId: chargeId,
          stripePaymentIntentId: paymentIntent.id,
          updatedAt: new Date(),
        })
        .where(and(
          eq(investmentCommitments.id, commitmentId),
          inArray(investmentCommitments.status, ['pending', 'processing'] as any),
        ))
        .returning();

      const finalizedCommitment = finalizedRows?.[0];
      if (!finalizedCommitment) {
        const [existing] = await tx
          .select()
          .from(investmentCommitments)
          .where(eq(investmentCommitments.id, commitmentId))
          .limit(1);

        if (!existing) {
          this.logger.error(`Commitment ${commitmentId} not found`);
        } else if (existing.status === 'paid') {
          this.logger.log(`Duplicate payment_intent.succeeded ignored for commitment ${commitmentId}`);
        } else {
          this.logger.warn(`Payment succeeded for commitment ${commitmentId}, but status ${existing.status} is not finalizable`);
        }

        return { commitment: null, campaign: null };
      }

      await tx
        .update(crowdfundingCampaigns)
        .set({
          fundingRaised: sql`${crowdfundingCampaigns.fundingRaised} + ${finalizedCommitment.amount}`,
          currentInvestorCount: sql`${crowdfundingCampaigns.currentInvestorCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(crowdfundingCampaigns.id, campaignId));

      await tx
        .update(escrowAccounts)
        .set({
          totalCommitted: sql`${escrowAccounts.totalCommitted} + ${finalizedCommitment.amount}`,
          totalHeld: sql`${escrowAccounts.totalHeld} + ${finalizedCommitment.amount}`,
        })
        .where(eq(escrowAccounts.campaignId, campaignId));

      const [updatedCampaign] = await tx
        .select()
        .from(crowdfundingCampaigns)
        .where(eq(crowdfundingCampaigns.id, campaignId))
        .limit(1);

      return { commitment: finalizedCommitment, campaign: updatedCampaign || null };
    });

    if (!commitment) {
      return;
    }

    if (
      campaign &&
      parseFloat(campaign.fundingRaised) >= parseFloat(campaign.fundingGoal)
    ) {
      await this.markCampaignAsFunded(campaignId);
    }

    this.logger.log(
      `Payment succeeded for commitment ${commitmentId}, campaign ${campaignId}`,
    );
  }

  private async runInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    if (typeof this.db.transaction === 'function') {
      return this.db.transaction(callback);
    }

    return callback(this.db);
  }

  private async handlePaymentIntentPaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const { commitmentId } = paymentIntent.metadata || {};

    if (!commitmentId) {
      this.logger.warn(
        'payment_intent.payment_failed missing commitmentId metadata',
      );
      return;
    }

    await this.db
      .update(investmentCommitments)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(investmentCommitments.id, commitmentId));

    this.logger.log(
      `Payment failed for commitment ${commitmentId}`,
    );
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id || null;

    if (!paymentIntentId) {
      this.logger.warn('charge.refunded missing payment_intent');
      return;
    }

    const [commitment] = await this.db
      .select()
      .from(investmentCommitments)
      .where(eq(investmentCommitments.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (!commitment) {
      this.logger.warn(
        `No commitment found for payment_intent ${paymentIntentId}`,
      );
      return;
    }

    await this.db
      .update(investmentCommitments)
      .set({
        status: 'refunded',
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(investmentCommitments.id, commitment.id));

    if (commitment.campaignId) {
      await this.db
        .update(escrowAccounts)
        .set({
          totalRefunded: sql`${escrowAccounts.totalRefunded} + ${commitment.amount}`,
          totalHeld: sql`${escrowAccounts.totalHeld} - ${commitment.amount}`,
        })
        .where(eq(escrowAccounts.campaignId, commitment.campaignId));
    }

    this.logger.log(
      `Charge refunded for commitment ${commitment.id}`,
    );
  }

  /**
   * Keeps the local Stripe Connect onboarding status in sync when Stripe pushes
   * an `account.updated` event, so the Connections dashboard reflects reality
   * without waiting for the next pull in getConnectStatus().
   */
  private async handleConnectAccountUpdated(account: Stripe.Account) {
    if (!account?.id) {
      this.logger.warn('account.updated event missing account id');
      return;
    }

    const onboardingComplete = Boolean(
      account.details_submitted && account.payouts_enabled,
    );

    const updated = await this.db
      .update(users)
      .set({ stripeOnboardingComplete: onboardingComplete, updatedAt: new Date() })
      .where(eq(users.stripeAccountId, account.id))
      .returning({ id: users.id });

    if (!updated?.length) {
      this.logger.warn(
        `account.updated for unknown connected account ${account.id}`,
      );
      return;
    }

    this.logger.log(
      `Synced Connect status for account ${account.id} (onboardingComplete=${onboardingComplete})`,
    );
  }

  /**
   * Handles a user revoking the platform's access to their Stripe account.
   * We clear the stored account id so the app stops treating them as connected
   * and prompts a re-connect.
   */
  private async handleConnectAccountDeauthorized(accountId: string | null) {
    if (!accountId) {
      this.logger.warn('account.application.deauthorized event missing account id');
      return;
    }

    const cleared = await this.db
      .update(users)
      .set({
        stripeAccountId: null,
        stripeOnboardingComplete: false,
        updatedAt: new Date(),
      })
      .where(eq(users.stripeAccountId, accountId))
      .returning({ id: users.id });

    this.logger.warn(
      `Connect account ${accountId} deauthorized; cleared for ${cleared?.length ?? 0} user(s)`,
    );
  }

  /**
   * Persists disputes (created/updated/closed), upserting by the Stripe dispute
   * id so redelivered or out-of-order events converge on the latest state.
   * Disputes are time-sensitive, so new ones are also logged at warn level.
   */
  private async handleChargeDispute(
    dispute: Stripe.Dispute,
    accountId: string | null,
  ) {
    const chargeId =
      typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? null;
    const paymentIntentId =
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id ?? null;
    const owner = await this.resolveConnectedOwner(accountId);
    const evidenceDueBy = dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000)
      : null;

    await this.db
      .insert(stripeDisputes)
      .values({
        stripeDisputeId: dispute.id,
        stripeChargeId: chargeId,
        stripePaymentIntentId: paymentIntentId,
        connectedAccountId: accountId,
        userId: owner.userId,
        appId: owner.appId,
        amount: dispute.amount ?? 0,
        currency: dispute.currency ?? 'usd',
        reason: dispute.reason ?? null,
        status: dispute.status,
        evidenceDueBy,
        rawEvent: dispute as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: stripeDisputes.stripeDisputeId,
        set: {
          status: dispute.status,
          reason: dispute.reason ?? null,
          amount: dispute.amount ?? 0,
          evidenceDueBy,
          userId: owner.userId,
          appId: owner.appId,
          rawEvent: dispute as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });

    this.logger.warn(
      `Stripe dispute ${dispute.status}: id=${dispute.id} amount=${dispute.amount} ` +
        `currency=${dispute.currency} reason=${dispute.reason} account=${accountId ?? 'platform'}`,
    );
  }

  /**
   * Upserts a subscription's current state from customer.subscription.* events,
   * keyed by the Stripe subscription id, and stores its normalised MRR so the
   * dashboard can report revenue without live Stripe calls.
   */
  private async handleSubscriptionEvent(
    subscription: Stripe.Subscription,
    accountId: string | null,
  ) {
    const owner = await this.resolveConnectedOwner(accountId);
    const primaryItem = subscription.items?.data?.[0];
    const price = primaryItem?.price;
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null;

    // The billing period lives on the subscription in older API versions and on
    // the subscription item in newer ones; read whichever is present.
    const periods = subscription as unknown as {
      current_period_start?: number;
      current_period_end?: number;
    };
    const periodStart =
      periods.current_period_start ??
      (primaryItem as any)?.current_period_start ??
      null;
    const periodEnd =
      periods.current_period_end ??
      (primaryItem as any)?.current_period_end ??
      null;

    await this.db
      .insert(stripeSubscriptions)
      .values({
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        connectedAccountId: accountId,
        userId: owner.userId,
        appId: owner.appId,
        status: subscription.status,
        priceId: price?.id ?? null,
        productId: typeof price?.product === 'string' ? price.product : price?.product?.id ?? null,
        currency: price?.currency ?? subscription.currency ?? null,
        unitAmount: price?.unit_amount ?? null,
        interval: price?.recurring?.interval ?? null,
        intervalCount: price?.recurring?.interval_count ?? 1,
        quantity: primaryItem?.quantity ?? 1,
        mrrAmount: this.subscriptionMrr(subscription),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        currentPeriodStart: this.unixToDate(periodStart),
        currentPeriodEnd: this.unixToDate(periodEnd),
        canceledAt: this.unixToDate(subscription.canceled_at),
        rawEvent: subscription as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: stripeSubscriptions.stripeSubscriptionId,
        set: {
          stripeCustomerId: customerId,
          userId: owner.userId,
          appId: owner.appId,
          status: subscription.status,
          priceId: price?.id ?? null,
          productId: typeof price?.product === 'string' ? price.product : price?.product?.id ?? null,
          currency: price?.currency ?? subscription.currency ?? null,
          unitAmount: price?.unit_amount ?? null,
          interval: price?.recurring?.interval ?? null,
          intervalCount: price?.recurring?.interval_count ?? 1,
          quantity: primaryItem?.quantity ?? 1,
          mrrAmount: this.subscriptionMrr(subscription),
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          currentPeriodStart: this.unixToDate(periodStart),
          currentPeriodEnd: this.unixToDate(periodEnd),
          canceledAt: this.unixToDate(subscription.canceled_at),
          rawEvent: subscription as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });

    this.logger.log(
      `Synced subscription ${subscription.id} (status=${subscription.status}) for account ${accountId ?? 'platform'}`,
    );
  }

  /** Resolves the local user/app that owns a connected Stripe account. */
  private async resolveConnectedOwner(
    accountId: string | null,
  ): Promise<{ userId: string | null; appId: string | null }> {
    if (!accountId) return { userId: null, appId: null };

    const [[user], [app]] = await Promise.all([
      this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeAccountId, accountId))
        .limit(1),
      this.db
        .select({ id: apps.id })
        .from(apps)
        .where(eq(apps.stripeAccountId, accountId))
        .limit(1),
    ]);

    return { userId: user?.id ?? null, appId: app?.id ?? null };
  }

  /** Normalised monthly recurring revenue (smallest currency unit). */
  private subscriptionMrr(subscription: Stripe.Subscription): number {
    if (!['active', 'trialing', 'past_due'].includes(subscription.status)) {
      return 0;
    }

    return (subscription.items?.data ?? []).reduce((total, item) => {
      const amount = item.price?.unit_amount;
      const interval = item.price?.recurring?.interval;
      const intervalCount = item.price?.recurring?.interval_count || 1;
      const quantity = item.quantity || 1;
      if (amount == null || !interval) return total;

      const monthly =
        interval === 'day'
          ? (amount * 365) / 12 / intervalCount
          : interval === 'week'
            ? (amount * 52) / 12 / intervalCount
            : interval === 'year'
              ? amount / 12 / intervalCount
              : amount / intervalCount; // month
      return total + Math.round(monthly * quantity);
    }, 0);
  }

  private unixToDate(seconds: number | null | undefined): Date | null {
    return seconds ? new Date(seconds * 1000) : null;
  }

  private async markCampaignAsFunded(campaignId: string) {
    await this.db
      .update(crowdfundingCampaigns)
      .set({
        status: 'funded',
        fundedAt: new Date(),
      })
      .where(eq(crowdfundingCampaigns.id, campaignId));

    await this.db
      .update(escrowAccounts)
      .set({ status: 'releasing' })
      .where(eq(escrowAccounts.campaignId, campaignId));

    this.logger.log(`Campaign ${campaignId} marked as funded via webhook`);
  }

  async createConnectAccount(userId: string, email: string) {
    if (!this.hasStripeConfig()) {
      return this.providerUnavailable('Stripe Connect is not configured');
    }

    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: email,
        capabilities: {
          transfers: { requested: true },
        },
      });

      await this.db
        .update(users)
        .set({
          stripeAccountId: account.id,
          stripeOnboardingComplete: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await this.supabase
        .from('users')
        .update({ stripe_account_id: account.id, stripe_connect_id: account.id })
        .eq('id', userId);

      const accountLink = await this.createAccountLink(account.id);

      return { provider: 'stripe', accountId: account.id, url: accountLink.url };
    } catch (err) {
      this.logger.error('Failed to create Stripe Connect account', err);
      throw new BadRequestException('Stripe connection failed');
    }
  }

  async getConnectStatus(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accountId = user.stripeAccountId || null;
    const base = {
      provider: 'stripe',
      connected: Boolean(accountId),
      accountId,
      onboardingComplete: Boolean(user.stripeOnboardingComplete),
      chargesEnabled: false,
      payoutsEnabled: false,
      providerAvailable: this.hasStripeConfig(),
      requirementsDue: [] as string[],
    };

    if (!accountId || !this.hasStripeConfig()) {
      return base;
    }

    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      const onboardingComplete = Boolean(account.details_submitted && account.payouts_enabled);

      if (onboardingComplete !== Boolean(user.stripeOnboardingComplete)) {
        await this.db
          .update(users)
          .set({ stripeOnboardingComplete: onboardingComplete, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      return {
        ...base,
        onboardingComplete,
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        requirementsDue: account.requirements?.currently_due || [],
      };
    } catch (err: any) {
      this.logger.warn(`Failed to retrieve Stripe Connect status: ${err?.message || err}`);
      return {
        ...base,
        providerAvailable: false,
        message: 'Could not retrieve Stripe Connect account status',
      };
    }
  }

  async refreshConnect(userId: string, email: string) {
    const status = await this.getConnectStatus(userId);

    if (!this.hasStripeConfig()) {
      return this.providerUnavailable('Stripe Connect is not configured');
    }

    if (!status.accountId) {
      return this.createConnectAccount(userId, email);
    }

    try {
      const accountLink = await this.createAccountLink(status.accountId);
      return {
        provider: 'stripe',
        accountId: status.accountId,
        url: accountLink.url,
        onboardingComplete: status.onboardingComplete,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to refresh Stripe Connect link: ${err?.message || err}`);
      return this.providerUnavailable('Stripe Connect onboarding link could not be refreshed');
    }
  }

  // ─── Stored webhook data (read) ─────────────────────────────────────────────

  /**
   * Lists disputes belonging to the current user (resolved from their connected
   * Stripe account when the webhook was ingested). Never returns the raw event.
   */
  async listDisputes(
    userId: string,
    filters: { appId?: string; status?: string } = {},
  ) {
    const conditions = [eq(stripeDisputes.userId, userId)];
    if (filters.appId) conditions.push(eq(stripeDisputes.appId, filters.appId));
    if (filters.status) conditions.push(eq(stripeDisputes.status, filters.status));

    const rows = await this.db
      .select({
        id: stripeDisputes.id,
        stripeDisputeId: stripeDisputes.stripeDisputeId,
        stripeChargeId: stripeDisputes.stripeChargeId,
        connectedAccountId: stripeDisputes.connectedAccountId,
        appId: stripeDisputes.appId,
        amount: stripeDisputes.amount,
        currency: stripeDisputes.currency,
        reason: stripeDisputes.reason,
        status: stripeDisputes.status,
        evidenceDueBy: stripeDisputes.evidenceDueBy,
        createdAt: stripeDisputes.createdAt,
        updatedAt: stripeDisputes.updatedAt,
      })
      .from(stripeDisputes)
      .where(and(...conditions))
      .orderBy(desc(stripeDisputes.createdAt));

    return rows;
  }

  /** Lists subscriptions belonging to the current user. */
  async listSubscriptions(
    userId: string,
    filters: { appId?: string; status?: string } = {},
  ) {
    const conditions = [eq(stripeSubscriptions.userId, userId)];
    if (filters.appId) conditions.push(eq(stripeSubscriptions.appId, filters.appId));
    if (filters.status) conditions.push(eq(stripeSubscriptions.status, filters.status));

    const rows = await this.db
      .select({
        id: stripeSubscriptions.id,
        stripeSubscriptionId: stripeSubscriptions.stripeSubscriptionId,
        stripeCustomerId: stripeSubscriptions.stripeCustomerId,
        connectedAccountId: stripeSubscriptions.connectedAccountId,
        appId: stripeSubscriptions.appId,
        status: stripeSubscriptions.status,
        priceId: stripeSubscriptions.priceId,
        productId: stripeSubscriptions.productId,
        currency: stripeSubscriptions.currency,
        unitAmount: stripeSubscriptions.unitAmount,
        interval: stripeSubscriptions.interval,
        intervalCount: stripeSubscriptions.intervalCount,
        quantity: stripeSubscriptions.quantity,
        mrrAmount: stripeSubscriptions.mrrAmount,
        cancelAtPeriodEnd: stripeSubscriptions.cancelAtPeriodEnd,
        currentPeriodStart: stripeSubscriptions.currentPeriodStart,
        currentPeriodEnd: stripeSubscriptions.currentPeriodEnd,
        canceledAt: stripeSubscriptions.canceledAt,
        createdAt: stripeSubscriptions.createdAt,
        updatedAt: stripeSubscriptions.updatedAt,
      })
      .from(stripeSubscriptions)
      .where(and(...conditions))
      .orderBy(desc(stripeSubscriptions.updatedAt));

    return rows;
  }

  /**
   * Aggregates stored MRR for the current user from ingested subscription
   * events — no live Stripe call. MRR is grouped by currency to avoid summing
   * across mismatched currencies.
   */
  async getSubscriptionSummary(userId: string, appId?: string) {
    const conditions = [
      eq(stripeSubscriptions.userId, userId),
      inArray(stripeSubscriptions.status, ['active', 'trialing', 'past_due'] as any),
    ];
    if (appId) conditions.push(eq(stripeSubscriptions.appId, appId));

    const rows = await this.db
      .select({
        currency: stripeSubscriptions.currency,
        totalMrr: sql<number>`COALESCE(SUM(${stripeSubscriptions.mrrAmount}), 0)`,
        activeSubscriptions: sql<number>`COUNT(*)`,
      })
      .from(stripeSubscriptions)
      .where(and(...conditions))
      .groupBy(stripeSubscriptions.currency);

    const byCurrency = rows.map((row: any) => ({
      currency: row.currency ?? 'usd',
      // Amounts are stored in the smallest unit; expose major units too.
      totalMrrMinor: Number(row.totalMrr) || 0,
      totalMrr: (Number(row.totalMrr) || 0) / 100,
      activeSubscriptions: Number(row.activeSubscriptions) || 0,
    }));

    return {
      activeSubscriptions: byCurrency.reduce((sum: number, c: { activeSubscriptions: number }) => sum + c.activeSubscriptions, 0),
      byCurrency,
    };
  }

  async getListingPayoutReadiness(listingId: string, userId: string) {
    const listing = await this.findOwnedListingOrThrow(listingId, userId);
    const connect = await this.getConnectStatus(userId);
    const payoutReady = Boolean(connect.connected && connect.onboardingComplete && connect.payoutsEnabled);

    return {
      listingId,
      payoutReady,
      ownerReady: payoutReady,
      provider: 'stripe',
      connect,
      listing: {
        status: listing.status,
        askingPrice: this.toNumber(listing.askingPrice),
        revenueVerified: Boolean(listing.revenueVerified),
        monthlyRevenue: this.toNumber(listing.monthlyRevenue),
      },
      blockers: [
        ...(!connect.connected ? ['connect_account_missing'] : []),
        ...(connect.connected && !connect.onboardingComplete ? ['connect_onboarding_incomplete'] : []),
        ...(connect.connected && !connect.payoutsEnabled ? ['payouts_not_enabled'] : []),
      ],
    };
  }

  async submitRevenueEvidence(listingId: string, userId: string, body: any = {}) {
    const listing = await this.findOwnedListingOrThrow(listingId, userId);
    const metadata = this.toRecord(listing.storeMetadata);
    const submittedAt = new Date().toISOString();
    const monthlyRevenue = this.toNullableNumber(body?.monthlyRevenue ?? body?.mrr ?? body?.amount);
    const evidence = {
      ...body,
      monthlyRevenue,
      submittedAt,
      submittedBy: userId,
      status: 'pending_review',
    };

    const updates: any = {
      storeMetadata: {
        ...metadata,
        revenueVerification: {
          ...(this.toRecord(metadata.revenueVerification)),
          status: 'pending_review',
          evidence,
          updatedAt: submittedAt,
        },
      },
      revenueVerified: false,
      updatedAt: new Date(),
    };

    if (monthlyRevenue !== null) {
      updates.monthlyRevenue = monthlyRevenue.toString();
    }

    const [updated] = await this.db
      .update(listings)
      .set(updates)
      .where(eq(listings.id, listingId))
      .returning();

    return {
      listingId,
      status: 'pending_review',
      revenueVerified: false,
      monthlyRevenue: this.toNumber(updated?.monthlyRevenue ?? listing.monthlyRevenue),
      evidence,
      persisted: true,
    };
  }

  async getRevenueVerification(listingId: string, userId: string) {
    const listing = await this.findOwnedListingOrThrow(listingId, userId);
    const metadata = this.toRecord(listing.storeMetadata);
    const revenueVerification = this.toRecord(metadata.revenueVerification);
    const status = listing.revenueVerified
      ? 'verified'
      : revenueVerification.status || 'unverified';

    return {
      listingId,
      status,
      verified: Boolean(listing.revenueVerified),
      monthlyRevenue: this.toNumber(listing.monthlyRevenue),
      evidence: revenueVerification.evidence || null,
      updatedAt: revenueVerification.updatedAt || listing.updatedAt,
    };
  }

  async verifyRevenue(appId: string, stripeAccountId: string) {
    // In a real scenario, you'd use the Stripe API to fetch balance transactions or payouts
    // filtered by the connected account to calculate MRR.
    // For this MVP, we'll simulate the fetch and return a verified status.

    try {
      const payouts = await this.stripe.payouts.list(
        { limit: 12 },
        { stripeAccount: stripeAccountId },
      );

      // Simple average of last 3 months for MRR verification
      const total = payouts.data
        .slice(0, 3)
        .reduce((acc, p) => acc + (p.amount / 100), 0);
      const verifiedMrr = total / 3;

      if (verifiedMrr > 0) {
        await this.supabase
          .from('listings')
          .update({
            revenue_verified: true,
            monthly_revenue: verifiedMrr.toString(),
          })
          .eq('app_id', appId);
      }

      return { verified: true, mrr: verifiedMrr };
    } catch (err) {
      this.logger.error('Revenue verification failed', err);
      return { verified: false, message: 'Could not verify revenue with Stripe' };
    }
  }

  private async createAccountLink(accountId: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/manage-listings?stripe=refresh`,
      return_url: `${frontendUrl}/manage-listings?stripe=success`,
      type: 'account_onboarding',
    });
  }

  private async findOwnedListingOrThrow(listingId: string, userId: string) {
    const [listing] = await this.db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    return listing;
  }

  private hasStripeConfig(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  private providerUnavailable(message: string) {
    return {
      provider: 'stripe',
      status: 'provider-unavailable',
      available: false,
      message,
    };
  }

  private toRecord(value: any): Record<string, any> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumber(value: unknown): number {
    return this.toNullableNumber(value) || 0;
  }
}
