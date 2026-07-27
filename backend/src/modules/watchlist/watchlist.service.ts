import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { listings } from '../../database/schema';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';
import {
  CreateWatchlistItemDto,
  UpdateWatchlistItemDto,
  WATCHLIST_STATUSES,
  WatchlistStatus,
} from './dto/watchlist.dto';

type FavoriteRow = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at?: string | null;
  notes?: string | null;
  status?: string | null;
};

@Injectable()
export class WatchlistService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  async findMine(userId: string, status?: string) {
    const normalizedStatus = status?.trim();
    let query = this.supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (this.isWatchlistStatus(normalizedStatus)) {
      query = query.eq('status', normalizedStatus);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const items = await this.mapRows(data || []);
    if (!normalizedStatus || this.isWatchlistStatus(normalizedStatus)) {
      return items;
    }

    return items.filter((item) => item.status === normalizedStatus || item.listing?.status === normalizedStatus);
  }

  async create(userId: string, dto: CreateWatchlistItemDto) {
    const listing = await this.findListing(dto.listingId);
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${dto.listingId} not found`);
    }

    const values: Record<string, any> = {
      user_id: userId,
      listing_id: dto.listingId,
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    if (dto.notes !== undefined) {
      values.notes = dto.notes;
    }

    const { data, error } = await this.supabase
      .from('favorites')
      .upsert(values, { onConflict: 'user_id,listing_id' })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return this.mapRow(data, listing);
  }

  async update(userId: string, listingId: string, dto: UpdateWatchlistItemDto) {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.notes !== undefined) {
      updates.notes = dto.notes;
    }
    if (dto.status !== undefined) {
      updates.status = dto.status;
    }

    const { data, error } = await this.supabase
      .from('favorites')
      .update(updates)
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new NotFoundException(`Watchlist item for listing ${listingId} not found`);
    }

    const listing = await this.findListing(listingId);
    return this.mapRow(data, listing);
  }

  async remove(userId: string, listingId: string) {
    const { error } = await this.supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);

    if (error) {
      throw error;
    }
  }

  private async mapRows(rows: FavoriteRow[]) {
    const listingIds = Array.from(new Set(rows.map((row) => row.listing_id).filter(Boolean)));
    const listingsById = new Map<string, any>();

    if (listingIds.length > 0) {
      const listingRows = await this.db.select().from(listings).where(inArray(listings.id, listingIds));
      listingRows.forEach((listing: any) => listingsById.set(listing.id, this.mapListing(listing)));
    }

    return rows.map((row) => this.mapRow(row, listingsById.get(row.listing_id)));
  }

  private async findListing(listingId: string) {
    const [listing] = await this.db.select().from(listings).where(inArray(listings.id, [listingId]));
    return listing ? this.mapListing(listing) : null;
  }

  private mapRow(row: FavoriteRow, listing?: any) {
    return {
      id: row.id,
      listingId: row.listing_id,
      addedAt: row.created_at,
      notes: row.notes ?? undefined,
      status: row.status || 'active',
      listing,
    };
  }

  private mapListing(item: any) {
    return {
      ...item,
      askingPrice: item.askingPrice ? parseFloat(item.askingPrice) : undefined,
      monthlyRevenue: item.monthlyRevenue ? parseFloat(item.monthlyRevenue) : undefined,
      targetRaise: item.targetRaise ? parseFloat(item.targetRaise) : undefined,
      equityAvailable: item.equityAvailable ? parseFloat(item.equityAvailable) : undefined,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    };
  }

  private isWatchlistStatus(status?: string): status is WatchlistStatus {
    return !!status && (WATCHLIST_STATUSES as readonly string[]).includes(status);
  }
}
