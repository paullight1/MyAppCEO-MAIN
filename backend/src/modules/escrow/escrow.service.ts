import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, inArray, or } from 'drizzle-orm';
import Stripe from 'stripe';
import { DRIZZLE } from '../../database/database.module';
import { listings, offers, users } from '../../database/schema';

const ACTIVE_STATUSES = new Set(['funding', 'inspection', 'approval', 'releasing', 'disputed']);

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(@Inject(DRIZZLE) private db: any) {}

  async findMine(userId: string) {
    const rows = await this.selectOfferListingRows(or(eq(offers.buyerId, userId), eq(listings.sellerId, userId)));
    return this.mapRows(rows);
  }

  async findOne(dealId: string, userId: string) {
    const rows = await this.selectOfferListingRows(eq(offers.id, dealId));
    const deal = (await this.mapRows(rows))[0];

    if (!deal || (deal.buyerId !== userId && deal.sellerId !== userId)) {
      throw new NotFoundException('Escrow deal not found');
    }

    return deal;
  }

  async getStats(userId: string) {
    const deals = await this.findMine(userId);
    return {
      totalValue: deals.reduce((sum: number, deal: any) => sum + deal.amount, 0),
      activeDeals: deals.filter((deal: any) => ACTIVE_STATUSES.has(deal.status)).length,
      completedDeals: deals.filter((deal: any) => deal.status === 'completed').length,
    };
  }

  async getTransferItems(dealId: string, userId: string) {
    await this.findOne(dealId, userId);
    return [];
  }

  async getFunding(dealId: string, userId: string) {
    const deal = await this.findOne(dealId, userId);

    return {
      dealId,
      status: 'unfunded',
      amount: deal.amount,
      requiredAmount: deal.amount,
      fundedAmount: 0,
      currency: 'usd',
      provider: 'stripe',
      providerAvailable: this.hasStripeConfig(),
      paymentIntentId: null,
      clientSecretAvailable: false,
      updatedAt: deal.updatedAt,
    };
  }

  async updateFunding(dealId: string, userId: string, body: any = {}) {
    const deal = await this.findOne(dealId, userId);

    return {
      dealId,
      status: body?.status || 'funding_update_requested',
      amount: deal.amount,
      currency: body?.currency || 'usd',
      provider: 'stripe',
      persisted: false,
      requestedAt: new Date().toISOString(),
      requestedBy: userId,
      message: 'Escrow funding state is derived from provider webhooks; no durable funding update was written.',
    };
  }

  async createPaymentIntent(dealId: string, userId: string, body: any = {}) {
    const deal = await this.findOne(dealId, userId);
    const currency = (body?.currency || 'usd').toLowerCase();
    const amount = Math.round(this.toNumber(body?.amount || deal.amount) * 100);

    if (!amount || amount <= 0) {
      throw new BadRequestException('Payment intent amount must be greater than zero');
    }

    if (!this.hasStripeConfig()) {
      return this.providerUnavailable(dealId, 'Stripe is not configured for escrow payment intents');
    }

    try {
      const stripe = this.createStripeClient();
      const intent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
          dealId,
          listingId: deal.listingId,
          buyerId: deal.buyerId,
          sellerId: deal.sellerId,
          source: 'marketplace_escrow',
        },
        automatic_payment_methods: { enabled: true },
      });

      return {
        provider: 'stripe',
        status: intent.status,
        id: intent.id,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        amount: intent.amount,
        currency: intent.currency,
        dealId,
      };
    } catch (err: any) {
      this.logger.warn(`Escrow payment intent creation failed: ${err?.message || err}`);
      return this.providerUnavailable(dealId, 'Stripe payment intent creation failed');
    }
  }

  async configureTransferItems(dealId: string, userId: string, body: any = {}) {
    await this.findOne(dealId, userId);
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    return {
      dealId,
      items: rawItems.map((item: any, index: number) => this.normalizeTransferItem(item, index)),
      persisted: false,
      message: 'Transfer checklist configuration is not backed by a durable table yet.',
      configuredAt: new Date().toISOString(),
      configuredBy: userId,
    };
  }

  async updateTransferItem(dealId: string, itemId: string, userId: string, body: any = {}) {
    await this.findOne(dealId, userId);

    return {
      dealId,
      itemId,
      status: body?.status || 'updated',
      notes: body?.notes || null,
      evidence: this.normalizeEvidence(body?.evidence),
      persisted: false,
      message: 'Transfer checklist item updates are not backed by a durable table yet.',
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
  }

  async getMilestones(dealId: string, userId: string) {
    await this.findOne(dealId, userId);
    return [];
  }

  async create(_offerId: string, _userId: string): Promise<never> {
    throw new BadRequestException('Escrow creation is not implemented yet');
  }

  async confirmTransferItem(dealId: string, itemId: string, role: string, userId?: string) {
    if (userId) {
      await this.findOne(dealId, userId);
    }

    return {
      dealId,
      itemId,
      role: role || 'participant',
      status: 'confirmation_requested',
      persisted: false,
      message: 'Escrow transfer confirmation is not backed by a durable checklist table yet.',
      confirmedAt: new Date().toISOString(),
      confirmedBy: userId || null,
    };
  }

  async updateMilestone(_dealId: string, _milestoneId: string, _status: string): Promise<never> {
    throw new BadRequestException('Escrow milestone updates are not implemented yet');
  }

  async releaseFunds(_dealId: string): Promise<never> {
    throw new BadRequestException('Escrow fund release is not implemented yet');
  }

  async refundDeal(dealId: string, userId: string, body: any = {}) {
    const deal = await this.findOne(dealId, userId);

    return {
      dealId,
      provider: 'stripe',
      status: 'provider-action-required',
      amount: this.toNumber(body?.amount || deal.amount),
      currency: body?.currency || 'usd',
      reason: body?.reason || null,
      persisted: false,
      message: 'No escrow payment intent or charge is stored for this deal, so no provider refund was executed.',
      requestedAt: new Date().toISOString(),
      requestedBy: userId,
    };
  }

  async getProviderState(dealId: string, userId: string) {
    const deal = await this.findOne(dealId, userId);

    return {
      dealId,
      provider: 'stripe',
      providerAvailable: this.hasStripeConfig(),
      paymentIntentId: null,
      chargeId: null,
      transferId: null,
      refundId: null,
      amount: deal.amount,
      currency: 'usd',
      state: 'not_linked',
      message: 'Marketplace escrow provider state is not persisted for accepted offers yet.',
      checkedAt: new Date().toISOString(),
    };
  }

  async disputeDeal(dealId: string, userId: string, body: any = {}) {
    await this.findOne(dealId, userId);

    return {
      dealId,
      status: 'dispute_requested',
      reason: body?.reason || null,
      evidence: this.normalizeEvidence(body?.evidence),
      requestedResolution: body?.requestedResolution || null,
      persisted: false,
      message: 'Escrow dispute capture is not backed by a durable dispute table yet.',
      requestedAt: new Date().toISOString(),
      requestedBy: userId,
    };
  }

  private async selectOfferListingRows(whereClause: any) {
    const query = this.db
      .select({
        offer: offers,
        listing: listings,
      })
      .from(offers);

    const joined = typeof query.innerJoin === 'function'
      ? query.innerJoin(listings, eq(offers.listingId, listings.id))
      : query;

    return joined.where(whereClause);
  }

  private async mapRows(rows: any[]) {
    const escrowRows = rows
      .map((row: any) => ({
        offer: row.offer || row.offers || row,
        listing: row.listing || row.listings || {},
      }))
      .filter(({ offer }: any) => offer.status === 'accepted');

    const userIds = Array.from(
      new Set(
        escrowRows.flatMap(({ offer, listing }: any) => [offer.buyerId, listing.sellerId]).filter(Boolean),
      ),
    );
    const userRows = userIds.length
      ? await this.db.select().from(users).where(inArray(users.id, userIds))
      : [];
    const userById = new Map(userRows.map((user: any) => [user.id, user]));

    return escrowRows.map(({ offer, listing }: any) => {
      const buyer = userById.get(offer.buyerId) || {};
      const seller = userById.get(listing.sellerId) || {};

      return {
        id: offer.id,
        listingId: offer.listingId,
        listingName: listing.name || 'Unknown listing',
        buyerId: offer.buyerId,
        buyerName: this.displayName(buyer, 'Buyer'),
        sellerId: listing.sellerId,
        sellerName: this.displayName(seller, 'Seller'),
        amount: this.toNumber(offer.amount),
        status: 'funding',
        stage: 1,
        lastActivity: this.toIsoString(offer.updatedAt || offer.createdAt),
        createdAt: this.toIsoString(offer.createdAt),
        updatedAt: this.toIsoString(offer.updatedAt || offer.createdAt),
      };
    });
  }

  private displayName(user: any, fallback: string): string {
    return user.fullName || user.email || fallback;
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

  private hasStripeConfig(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  private createStripeClient() {
    return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  private providerUnavailable(dealId: string, message: string) {
    return {
      dealId,
      provider: 'stripe',
      status: 'provider-unavailable',
      available: false,
      message,
    };
  }

  private normalizeTransferItem(item: any, index: number) {
    return {
      id: item?.id || item?.key || `item-${index + 1}`,
      title: item?.title || item?.label || `Transfer item ${index + 1}`,
      description: item?.description || null,
      status: item?.status || 'pending',
      notes: item?.notes || null,
      evidence: this.normalizeEvidence(item?.evidence),
      requiredFrom: item?.requiredFrom || item?.role || 'seller',
    };
  }

  private normalizeEvidence(evidence: any) {
    if (!evidence) return [];
    return Array.isArray(evidence) ? evidence : [evidence];
  }
}
