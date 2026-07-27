import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const STORE_PLATFORMS = ['ios', 'android', 'all'] as const;
export type StorePlatform = (typeof STORE_PLATFORMS)[number];

export class ExternalAppSearchDto {
  @IsString()
  @IsOptional()
  term?: string;

  @IsIn(STORE_PLATFORMS)
  @IsOptional()
  platform?: StorePlatform;

  @IsString()
  @IsOptional()
  country?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  category?: string;
}

