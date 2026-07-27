import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { DRIZZLE } from "../../database/database.module";
import { SUPABASE_ADMIN } from "../supabase/supabase.module";
import { listings } from "../../database/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { createHash } from "crypto";
import {
  CreateListingDto,
  ListingFilterDto,
  ReviewListingDto,
  TrackListingViewDto,
  UpdateListingDto,
  UpdateListingStatusDto,
  UpdatePricingDto,
} from "./dto/listing.dto";
import { SupabaseClient } from "@supabase/supabase-js";
import { SearchService } from "../search/search.service";
import { CacheService } from "../../common/cache/cache.service";

type ListingReviewStatus =
  | "draft"
  | "pending_review"
  | "under_review"
  | "active"
  | "paused"
  | "sold"
  | "rejected"
  | "archived"
  | "changes_requested";

@Injectable()
export class ListingService {
  private readonly listingListCacheTtlSeconds = 60;
  private readonly listingDetailCacheTtlSeconds = 300;

  constructor(
    @Inject(DRIZZLE) private db: any,
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
    private searchService: SearchService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(filters: ListingFilterDto, page = 1, limit = 20) {
    const cacheKey = this.cacheService.createKey("listings:findAll", {
      category: filters.category,
      listingType: filters.listingType,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      page,
      limit,
    });

    return this.cacheService.wrap(
      cacheKey,
      this.listingListCacheTtlSeconds,
      () => this.findAllFresh(filters, page, limit),
    );
  }

  private async findAllFresh(filters: ListingFilterDto, page = 1, limit = 20) {
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(listings.category, filters.category));
    }
    if (filters.listingType) {
      conditions.push(eq(listings.listingType, filters.listingType));
    }
    if (filters.minPrice) {
      conditions.push(gte(listings.askingPrice, filters.minPrice.toString()));
    }
    if (filters.maxPrice) {
      conditions.push(lte(listings.askingPrice, filters.maxPrice.toString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;

    const offset = (page - 1) * limit;
    const result = await this.db
      .select()
      .from(listings)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return {
      data: result.map(this.mapToType),
      meta: { page, limit, total },
    };
  }

  async findAllMine(sellerId: string) {
    const result = await this.db
      .select()
      .from(listings)
      .where(eq(listings.sellerId, sellerId));
    return result.map(this.mapToType);
  }

  async findOne(id: string) {
    return this.cacheService.wrap(
      `listings:${id}`,
      this.listingDetailCacheTtlSeconds,
      async () => {
        const [listing] = await this.db
          .select()
          .from(listings)
          .where(eq(listings.id, id));
        if (!listing)
          throw new NotFoundException(`Listing with ID ${id} not found`);
        return this.mapToType(listing);
      },
    );
  }

  async trackView(
    id: string,
    dto: TrackListingViewDto,
    context: { ip?: string; userAgent?: string; referrer?: string } = {},
  ) {
    await this.findListingOrThrow(id);

    const tracked = await this.insertListingViewBestEffort(id, dto, context);
    if (tracked) {
      await this.invalidateListingCache(id);
    }

    return { tracked, listingId: id };
  }

  async getHistory(id: string, user: any) {
    const listing = await this.findListingOrThrow(id);
    this.assertCanAccessListing(listing, user);

    const { data, error } = await this.supabase
      .from("listing_activity_history")
      .select("*")
      .eq("listing_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      listingId: item.listing_id || item.listingId || id,
      actorId: item.actor_id || item.actorId || undefined,
      action: item.action,
      fromStatus: item.from_status || item.fromStatus || undefined,
      toStatus: item.to_status || item.toStatus || undefined,
      metadata: item.metadata || {},
      createdAt: item.created_at || item.createdAt,
    }));
  }

  async getReview(id: string, user: any) {
    const listing = await this.findListingOrThrow(id);
    this.assertCanAccessListing(listing, user);

    return this.buildReviewState(listing);
  }

  async review(id: string, dto: ReviewListingDto, user: any) {
    const listing = await this.findListingOrThrow(id);
    const isReviewer = this.isPrivilegedReviewer(user);

    if (!isReviewer) {
      if (listing.sellerId !== user?.id) {
        throw new ForbiddenException("You do not own this listing");
      }
      if (dto.action) {
        throw new ForbiddenException(
          "Only marketplace reviewers can approve, reject, or request changes",
        );
      }

      const storeMetadata = this.asRecord(listing.storeMetadata);
      const [updated] = await this.db
        .update(listings)
        .set({
          storeMetadata: {
            ...storeMetadata,
            reviewSubmission: {
              ...this.asRecord(storeMetadata.reviewSubmission),
              metadata: dto.metadata || {},
              evidence: dto.evidence || {},
              notes: dto.notes,
              submittedAt: new Date().toISOString(),
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(listings.id, id))
        .returning();

      await this.recordListingActivity(
        id,
        user.id,
        "review_metadata_submitted",
        listing.status,
        listing.status,
        {
          metadata: dto.metadata || {},
          evidence: dto.evidence || {},
        },
      );
      await this.invalidateListingCache(id);

      return this.buildReviewState(updated || listing, undefined, dto.notes);
    }

    if (!dto.action) {
      throw new BadRequestException("Review action is required for reviewers");
    }
    if (
      (dto.action === "reject" || dto.action === "request_changes") &&
      !(dto.reason || dto.notes)
    ) {
      throw new BadRequestException(
        "A reason or notes are required for this review action",
      );
    }

    const targetStatus = dto.action === "approve" ? "active" : "rejected";
    const reviewedAt = new Date();
    const [updated] = await this.db
      .update(listings)
      .set({ status: targetStatus, updatedAt: reviewedAt })
      .where(eq(listings.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    const mapped = this.mapToType(updated);
    const reviewStatus: ListingReviewStatus =
      dto.action === "request_changes" ? "changes_requested" : mapped.status;

    await this.updateListingReviewColumnsBestEffort(id, {
      status: targetStatus,
      reviewed_by: user.id,
      reviewed_at: reviewedAt.toISOString(),
      rejected_reason:
        dto.action === "approve" ? null : dto.reason || dto.notes || null,
      revenue_evidence_review_status:
        dto.action === "approve" ? "approved" : undefined,
      updated_at: reviewedAt.toISOString(),
    });

    await this.recordListingActivity(
      id,
      user.id,
      `listing_${dto.action}`,
      listing.status,
      reviewStatus,
      {
        reason: dto.reason,
        notes: dto.notes,
        metadata: dto.metadata || {},
        evidence: dto.evidence || {},
      },
    );

    if (targetStatus === "active") {
      await this.searchService.indexListing({
        id: mapped.id,
        name: mapped.name,
        description: mapped.longDescription || mapped.shortDescription || "",
        category: mapped.category || "",
        listingType: mapped.listingType || "sale",
        askingPrice: mapped.askingPrice || null,
        monthlyRevenue: mapped.monthlyRevenue || null,
        status: mapped.status || "active",
        sellerId: mapped.sellerId,
        createdAt: mapped.createdAt || new Date(),
      });
    } else {
      await this.searchService.deleteListing(id);
    }

    await this.invalidateListingCache(id);

    return this.buildReviewState(mapped, reviewStatus, dto.notes || dto.reason);
  }

  async create(dto: CreateListingDto, sellerId: string) {
    let slug = dto.name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
    const existing = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.slug, slug))
      .limit(1);
    if (existing.length > 0) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const [newListing] = await this.db
      .insert(listings)
      .values({
        ...dto,
        sellerId,
        slug,
        status: "draft",
        askingPrice: dto.askingPrice?.toString(),
        monthlyRevenue: dto.monthlyRevenue?.toString(),
        targetRaise: dto.targetRaise?.toString(),
        equityAvailable: dto.equityAvailable?.toString(),
      })
      .returning();

    const mappedListing = this.mapToType(newListing);

    await this.searchService.indexListing({
      id: mappedListing.id,
      name: mappedListing.name,
      description: dto.longDescription || dto.shortDescription || "",
      category: mappedListing.category || "",
      listingType: mappedListing.listingType || "sale",
      askingPrice: mappedListing.askingPrice || null,
      monthlyRevenue: mappedListing.monthlyRevenue || null,
      status: mappedListing.status || "draft",
      sellerId,
      createdAt: mappedListing.createdAt || new Date(),
    });

    await this.invalidateListingCache(mappedListing.id);

    return mappedListing;
  }

  async updateStatus(id: string, dto: UpdateListingStatusDto, userId: string) {
    await this.findOwnedListingOrThrow(id, userId);

    const [updated] = await this.db
      .update(listings)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    const mapped = this.mapToType(updated);

    if (dto.status === "archived" || dto.status === "sold") {
      await this.searchService.deleteListing(id);
    } else if (dto.status === "active") {
      await this.searchService.indexListing({
        id: mapped.id,
        name: mapped.name,
        description: mapped.longDescription || mapped.shortDescription || "",
        category: mapped.category || "",
        listingType: mapped.listingType || "sale",
        askingPrice: mapped.askingPrice || null,
        monthlyRevenue: mapped.monthlyRevenue || null,
        status: mapped.status || "active",
        sellerId: mapped.sellerId,
        createdAt: mapped.createdAt || new Date(),
      });
    }

    await this.invalidateListingCache(id);

    return mapped;
  }

  async update(id: string, dto: UpdateListingDto, userId: string) {
    await this.findOwnedListingOrThrow(id, userId);

    const updates = {
      ...dto,
      askingPrice: dto.askingPrice?.toString(),
      monthlyRevenue: dto.monthlyRevenue?.toString(),
      targetRaise: dto.targetRaise?.toString(),
      equityAvailable: dto.equityAvailable?.toString(),
      updatedAt: new Date(),
    };

    const [updated] = await this.db
      .update(listings)
      .set(updates)
      .where(eq(listings.id, id))
      .returning();

    const mapped = this.mapToType(updated);

    if (mapped.status === "active") {
      await this.searchService.indexListing({
        id: mapped.id,
        name: mapped.name,
        description: mapped.longDescription || mapped.shortDescription || "",
        category: mapped.category || "",
        listingType: mapped.listingType || "sale",
        askingPrice: mapped.askingPrice || null,
        monthlyRevenue: mapped.monthlyRevenue || null,
        status: mapped.status || "active",
        sellerId: mapped.sellerId,
        createdAt: mapped.createdAt || new Date(),
      });
    }

    await this.invalidateListingCache(id);

    return mapped;
  }

  async updatePricing(id: string, dto: UpdatePricingDto, userId: string) {
    const [existing] = await this.db
      .select()
      .from(listings)
      .where(eq(listings.id, id));
    if (!existing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }
    if (existing.sellerId !== userId) {
      throw new ForbiddenException("You do not own this listing");
    }

    const [updated] = await this.db
      .update(listings)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id))
      .returning();

    await this.supabase.from("audit_logs").insert({
      user_id: userId,
      action_type: "PRICING_UPDATE",
      metadata: { listing_id: id, new_price: dto.price },
    });

    const mapped = this.mapToType(updated);

    if (mapped.status === "active") {
      await this.searchService.indexListing({
        id: mapped.id,
        name: mapped.name,
        description: mapped.longDescription || mapped.shortDescription || "",
        category: mapped.category || "",
        listingType: mapped.listingType || "sale",
        askingPrice: mapped.askingPrice || null,
        monthlyRevenue: mapped.monthlyRevenue || null,
        status: mapped.status || "active",
        sellerId: mapped.sellerId,
        createdAt: mapped.createdAt || new Date(),
      });
    }

    await this.invalidateListingCache(id);

    return mapped;
  }

  async remove(id: string, userId: string) {
    await this.findOwnedListingOrThrow(id, userId);

    await this.db.delete(listings).where(eq(listings.id, id));
    await this.searchService.deleteListing(id);
    await this.invalidateListingCache(id);

    return { success: true, message: "Listing deleted" };
  }

  async syncAllToSearch() {
    const allListings = await this.db
      .select()
      .from(listings)
      .where(eq(listings.status, "active"));

    const searchListings = allListings.map((l: any) => ({
      id: l.id,
      name: l.name,
      description: l.longDescription || l.shortDescription || "",
      category: l.category || "",
      listingType: l.listingType || "sale",
      askingPrice: l.askingPrice ? parseFloat(l.askingPrice) : null,
      monthlyRevenue: l.monthlyRevenue ? parseFloat(l.monthlyRevenue) : null,
      status: l.status,
      sellerId: l.sellerId,
      createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
    }));

    await this.searchService.indexListings(searchListings);

    return { success: true, count: searchListings.length };
  }

  private async invalidateListingCache(id?: string) {
    await this.cacheService.deleteByPattern("listings:findAll:*");
    if (id) {
      await this.cacheService.del(`listings:${id}`);
    }
  }

  private async findListingOrThrow(id: string) {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(eq(listings.id, id));
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    return listing;
  }

  private async findOwnedListingOrThrow(id: string, userId: string) {
    const listing = await this.findListingOrThrow(id);
    if (listing.sellerId !== userId) {
      throw new ForbiddenException("You do not own this listing");
    }

    return listing;
  }

  private assertCanAccessListing(listing: any, user: any) {
    if (listing.sellerId === user?.id || this.isPrivilegedReviewer(user)) {
      return;
    }

    throw new ForbiddenException("You do not have access to this listing");
  }

  private isPrivilegedReviewer(user: any) {
    const roles = new Set([
      ...(Array.isArray(user?.roles) ? user.roles : []),
      ...(user?.role ? [user.role] : []),
    ]);

    return [
      "admin",
      "super_admin",
      "moderator",
      "content_reviewer",
      "reviewer",
    ].some((role) => roles.has(role));
  }

  private async insertListingViewBestEffort(
    listingId: string,
    dto: TrackListingViewDto,
    context: { ip?: string; userAgent?: string; referrer?: string },
  ) {
    const payload = {
      listing_id: listingId,
      session_id: dto.sessionId || null,
      visitor_id: dto.visitorId || null,
      referrer: dto.referrer || context.referrer || null,
      device_type: dto.deviceType || null,
      user_agent: dto.userAgent || context.userAgent || null,
      country_code: dto.countryCode?.slice(0, 2).toUpperCase() || null,
      ip_hash: context.ip
        ? createHash("sha256").update(context.ip).digest("hex")
        : null,
      viewed_at: dto.trackedAt || new Date().toISOString(),
    };

    const result = await this.supabase
      .from("listing_views")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (!result.error) {
      return true;
    }
    if (this.isDuplicateInsertError(result.error)) {
      return false;
    }

    const fallback = {
      listing_id: listingId,
      referrer: payload.referrer,
      device_type: payload.device_type,
      viewed_at: payload.viewed_at,
    };
    const fallbackResult = await this.supabase
      .from("listing_views")
      .insert(fallback)
      .select("id")
      .maybeSingle();

    if (!fallbackResult.error) {
      return true;
    }

    return this.isDuplicateInsertError(fallbackResult.error) ? false : false;
  }

  private async buildReviewState(
    listing: any,
    statusOverride?: ListingReviewStatus,
    notesOverride?: string,
  ) {
    const remote = await this.getListingRowBestEffort(listing.id);
    const source = remote || {};
    const storeMetadata = {
      ...this.asRecord(listing.storeMetadata),
      ...this.asRecord(source.store_metadata || source.storeMetadata),
    };
    const reviewSubmission = this.asRecord(storeMetadata.reviewSubmission);

    const status = statusOverride || source.status || listing.status;
    const notes =
      notesOverride ||
      source.review_notes ||
      source.reviewNotes ||
      source.rejected_reason ||
      source.rejectedReason ||
      reviewSubmission.notes;

    return {
      listingId: listing.id,
      status,
      revenueEvidenceStatus:
        source.revenue_evidence_review_status ||
        source.revenueEvidenceReviewStatus ||
        reviewSubmission.revenueEvidenceStatus ||
        "not_submitted",
      notes,
      reason: source.rejected_reason || source.rejectedReason || undefined,
      reviewedBy: source.reviewed_by || source.reviewedBy || undefined,
      reviewedAt: source.reviewed_at || source.reviewedAt || undefined,
      submittedAt:
        source.submitted_at ||
        source.submittedAt ||
        reviewSubmission.submittedAt,
      updatedAt: source.updated_at || source.updatedAt || listing.updatedAt,
      evidence: {
        revenueEvidencePath:
          source.revenue_evidence_path ||
          source.revenueEvidencePath ||
          reviewSubmission.evidence?.revenueEvidencePath,
        repositoryUrl: source.repository_url || listing.repositoryUrl,
        documentationUrl: source.documentation_url || listing.documentationUrl,
        appStoreUrl: source.app_store_url || listing.appStoreUrl,
        playStoreUrl: source.play_store_url || listing.playStoreUrl,
        demoVideoUrl: source.demo_video_url || listing.demoVideoUrl,
        metadata: reviewSubmission.metadata || {},
        mediaMetadata: source.media_metadata || source.mediaMetadata || {},
        storeMetadata,
      },
    };
  }

  private async getListingRowBestEffort(id: string) {
    const { data, error } = await this.supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return error ? null : data;
  }

  private async updateListingReviewColumnsBestEffort(
    id: string,
    updates: Record<string, any>,
  ) {
    const payload = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );
    await this.supabase.from("listings").update(payload).eq("id", id);
  }

  private async recordListingActivity(
    listingId: string,
    actorId: string | undefined,
    action: string,
    fromStatus?: string,
    toStatus?: string,
    metadata: Record<string, any> = {},
  ) {
    await this.supabase.from("listing_activity_history").insert({
      listing_id: listingId,
      actor_id: actorId || null,
      action,
      from_status: fromStatus || null,
      to_status: toStatus || null,
      metadata,
    });
  }

  private isDuplicateInsertError(error: any) {
    return (
      error?.code === "23505" ||
      String(error?.message || "").includes("duplicate key")
    );
  }

  private asRecord(value: any): Record<string, any> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  private mapToType(item: any) {
    return {
      ...item,
      askingPrice: item.askingPrice ? parseFloat(item.askingPrice) : undefined,
      monthlyRevenue: item.monthlyRevenue
        ? parseFloat(item.monthlyRevenue)
        : undefined,
      targetRaise: item.targetRaise ? parseFloat(item.targetRaise) : undefined,
      equityAvailable: item.equityAvailable
        ? parseFloat(item.equityAvailable)
        : undefined,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    };
  }
}
