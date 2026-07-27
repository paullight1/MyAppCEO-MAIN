import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export const WATCHLIST_STATUSES = ['active', 'archived'] as const;
export type WatchlistStatus = (typeof WATCHLIST_STATUSES)[number];

export class WatchlistFilterDto {
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateWatchlistItemDto {
  @IsUUID()
  listingId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  source?: string;
}

export class UpdateWatchlistItemDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(WATCHLIST_STATUSES)
  @IsOptional()
  status?: WatchlistStatus;
}
