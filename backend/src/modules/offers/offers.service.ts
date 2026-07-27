import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { listings, offers } from '../../database/schema';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';
import {
  CounterOfferDto,
  CreateOfferDto,
  RespondToCounterOfferDto,
  UpdateOfferStatusDto,
} from './dto/offer.dto';

type OfferStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    @Inject(DRIZZLE) private db: any,
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOfferDto, buyerId: string) {
    const [listing] = await this.db.select().from(listings).where(eq(listings.id, dto.listingId));
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== 'active') throw new BadRequestException('Cannot make an offer on an inactive listing');
    if (listing.sellerId === buyerId) throw new BadRequestException('You cannot make an offer on your own listing');

    const [existingOpenOffer] = await this.db
      .select()
      .from(offers)
      .where(
        and(
          eq(offers.listingId, dto.listingId),
          eq(offers.buyerId, buyerId),
          sql`${offers.status} in ('pending', 'countered')`,
        ),
      )
      .limit(1);

    if (existingOpenOffer) {
      if (dto.idempotencyKey && this.isSameOffer(existingOpenOffer, dto)) {
        return existingOpenOffer;
      }
      throw new ConflictException('You already have a pending or countered offer for this listing');
    }

    const [newOffer] = await this.db
      .insert(offers)
      .values({
        listingId: dto.listingId,
        buyerId,
        amount: this.toMoneyString(dto.amount),
        message: dto.message,
        status: 'pending',
      })
      .returning();

    await this.audit('OFFER_CREATED', buyerId, newOffer.id, {
      listing_id: listing.id,
      seller_id: listing.sellerId,
      amount: newOffer.amount,
      idempotency_key: dto.idempotencyKey,
    });

    await this.notificationsService.notify(
      listing.sellerId,
      NotificationType.OFFER_RECEIVED,
      'New Offer Received!',
      `You received a cash offer of $${Number(dto.amount).toLocaleString()} for ${listing.name}.`,
      { offerId: newOffer.id, listingId: listing.id },
    );

    return newOffer;
  }

  async findByListing(listingId: string, sellerId: string) {
    await this.findOwnedListingOrThrow(listingId, sellerId);
    return await this.db.select().from(offers).where(eq(offers.listingId, listingId));
  }

  async findMySentOffers(buyerId: string) {
    return await this.db.select().from(offers).where(eq(offers.buyerId, buyerId));
  }

  async findMyReceivedOffers(sellerId: string) {
    const rows = await this.db
      .select({
        offer: offers,
        listing: listings,
      })
      .from(offers)
      .innerJoin(listings, eq(offers.listingId, listings.id))
      .where(eq(listings.sellerId, sellerId));

    return rows.map((row: any) => ({
      ...(row.offer || row.offers || row),
      listing: row.listing || row.listings,
    }));
  }

  async counter(id: string, dto: CounterOfferDto, sellerId: string) {
    const { offer, listing } = await this.findOfferWithListingOrThrow(id);

    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Only the seller can counter an offer');
    }

    if (this.isStatus(offer, 'countered') && dto.idempotencyKey && this.isSameCounter(offer, dto)) {
      return offer;
    }

    if (!this.isStatus(offer, 'pending')) {
      throw new BadRequestException('Only pending offers can be countered');
    }

    const [updated] = await this.db
      .update(offers)
      .set({
        amount: this.toMoneyString(dto.amount),
        message: dto.message,
        status: 'countered' as any,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, id))
      .returning();

    await this.audit('OFFER_COUNTERED', sellerId, id, {
      listing_id: listing.id,
      buyer_id: offer.buyerId,
      amount: updated.amount,
      idempotency_key: dto.idempotencyKey,
    });

    await this.notificationsService.notify(
      offer.buyerId,
      NotificationType.OFFER_RECEIVED,
      'Counter Offer Received',
      `The seller countered your offer for ${listing.name} at $${Number(dto.amount).toLocaleString()}.`,
      { offerId: offer.id, listingId: listing.id },
    );

    return updated;
  }

  async respondToCounter(id: string, dto: RespondToCounterOfferDto, buyerId: string) {
    const { offer, listing } = await this.findOfferWithListingOrThrow(id);

    if (offer.buyerId !== buyerId) {
      throw new ForbiddenException('Only the buyer can respond to a counter-offer');
    }

    if (dto.idempotencyKey && this.isStatus(offer, dto.response)) {
      return offer;
    }

    if (!this.isStatus(offer, 'countered')) {
      throw new BadRequestException('Only countered offers can be accepted or rejected by the buyer');
    }

    const [updated] = await this.db
      .update(offers)
      .set({
        status: dto.response,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, id))
      .returning();

    await this.audit(`OFFER_COUNTER_${dto.response.toUpperCase()}`, buyerId, id, {
      listing_id: listing.id,
      seller_id: listing.sellerId,
      message: dto.message,
      idempotency_key: dto.idempotencyKey,
    });

    await this.notificationsService.notify(
      listing.sellerId,
      dto.response === 'accepted' ? NotificationType.OFFER_ACCEPTED : NotificationType.OFFER_REJECTED,
      `Counter Offer ${this.titleCase(dto.response)}`,
      `Your counter-offer for ${listing.name} was ${dto.response} by the buyer.`,
      { offerId: offer.id, listingId: listing.id },
    );

    return updated;
  }

  async updateStatus(id: string, dto: UpdateOfferStatusDto, userId: string) {
    const { offer, listing } = await this.findOfferWithListingOrThrow(id);

    if (dto.status === 'withdrawn') {
      if (offer.buyerId !== userId) {
        throw new ForbiddenException('Only the buyer can withdraw an offer');
      }
      if (dto.idempotencyKey && this.isStatus(offer, 'withdrawn')) {
        return offer;
      }
      if (!this.isStatus(offer, 'pending') && !this.isStatus(offer, 'countered')) {
        throw new BadRequestException('Only pending or countered offers can be withdrawn');
      }
    }

    if (dto.status === 'accepted' || dto.status === 'rejected') {
      if (listing.sellerId !== userId) {
        throw new ForbiddenException('Only the seller can accept or reject an offer');
      }
      if (dto.idempotencyKey && this.isStatus(offer, dto.status)) {
        return offer;
      }
      if (!this.isStatus(offer, 'pending')) {
        throw new BadRequestException('Only pending buyer offers can be accepted or rejected by the seller');
      }
    }

    const [updated] = await this.db
      .update(offers)
      .set({
        status: dto.status,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, id))
      .returning();

    await this.audit(`OFFER_${dto.status.toUpperCase()}`, userId, id, {
      listing_id: listing.id,
      buyer_id: offer.buyerId,
      seller_id: listing.sellerId,
      message: dto.message,
      idempotency_key: dto.idempotencyKey,
    });

    if (dto.status === 'accepted' || dto.status === 'rejected') {
      await this.notificationsService.notify(
        offer.buyerId,
        dto.status === 'accepted' ? NotificationType.OFFER_ACCEPTED : NotificationType.OFFER_REJECTED,
        `Offer ${this.titleCase(dto.status)}`,
        `Your offer for ${listing.name} was ${dto.status} by the seller.`,
        { offerId: offer.id, listingId: listing.id },
      );
    }

    return updated;
  }

  private async findOwnedListingOrThrow(id: string, sellerId: string) {
    const [listing] = await this.db.select().from(listings).where(eq(listings.id, id));
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('You do not own this listing');
    }

    return listing;
  }

  private async findOfferWithListingOrThrow(id: string) {
    const [offer] = await this.db.select().from(offers).where(eq(offers.id, id));
    if (!offer) throw new NotFoundException('Offer not found');

    const [listing] = await this.db.select().from(listings).where(eq(listings.id, offer.listingId));
    if (!listing) throw new NotFoundException('Listing not found');

    return { offer, listing };
  }

  private async audit(actionType: string, userId: string, offerId: string, metadata: Record<string, any>) {
    try {
      const { error } = await this.supabase.from('audit_logs').insert({
        user_id: userId,
        action_type: actionType,
        metadata: {
          offer_id: offerId,
          ...metadata,
        },
      });

      if (error) {
        this.logger.warn(`Offer audit skipped: ${error.message}`);
      }
    } catch (error) {
      this.logger.warn(`Offer audit skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private isSameCounter(offer: any, dto: CounterOfferDto) {
    return Number(offer.amount) === Number(dto.amount) && (offer.message || undefined) === (dto.message || undefined);
  }

  private isSameOffer(offer: any, dto: CreateOfferDto) {
    return Number(offer.amount) === Number(dto.amount) && (offer.message || undefined) === (dto.message || undefined);
  }

  private isStatus(offer: any, status: OfferStatus) {
    return offer.status === status;
  }

  private titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private toMoneyString(amount: number) {
    return Number(amount).toFixed(2);
  }
}
