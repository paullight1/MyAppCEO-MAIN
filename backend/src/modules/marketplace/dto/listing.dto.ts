import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsBoolean,
  Min,
  IsArray,
  IsUrl,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/swagger";

export type ListingType = "sale" | "investment" | "both";

class TrafficMetricsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyVisitors?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bounceRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  avgSessionDuration?: number;
}

class UnitEconomicsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  cac?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ltv?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mrrChurn?: number;
}

class HandoverReadinessDto {
  @IsString()
  @IsOptional()
  hostingProvider?: string;

  @IsString()
  @IsOptional()
  domainRegistrar?: string;

  @IsBoolean()
  @IsOptional()
  hasDbSchema?: boolean;

  @IsBoolean()
  @IsOptional()
  hasSop?: boolean;
}

export class CreateListingDto {
  @IsUUID()
  @IsOptional()
  appId?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  longDescription?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  screenshots?: string[];

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  demoVideoUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  techStack?: string[];

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  repositoryUrl?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  documentationUrl?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  appStoreUrl?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  playStoreUrl?: string;

  @IsObject()
  @IsOptional()
  storeMetadata?: Record<string, any>;

  @IsNumber()
  @Min(0)
  @IsOptional()
  askingPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRevenue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalUsers?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ageMonths?: number;

  @IsBoolean()
  @IsOptional()
  revenueVerified?: boolean;

  @IsEnum(["sale", "investment", "both"])
  listingType: ListingType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  targetRaise?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  equityAvailable?: number;

  @ValidateNested()
  @Type(() => TrafficMetricsDto)
  @IsOptional()
  trafficMetrics?: TrafficMetricsDto;

  @ValidateNested()
  @Type(() => UnitEconomicsDto)
  @IsOptional()
  unitEconomics?: UnitEconomicsDto;

  @ValidateNested()
  @Type(() => HandoverReadinessDto)
  @IsOptional()
  handoverReadiness?: HandoverReadinessDto;
}

export class UpdateListingStatusDto {
  @IsEnum([
    "draft",
    "pending_review",
    "under_review",
    "active",
    "paused",
    "sold",
    "rejected",
    "archived",
  ])
  status: string;
}

export class TrackListingViewDto {
  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  visitorId?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  trackedAt?: string;
}

export class ReviewListingDto {
  @IsEnum(["approve", "reject", "request_changes"])
  @IsOptional()
  action?: "approve" | "reject" | "request_changes";

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsObject()
  @IsOptional()
  evidence?: Record<string, any>;
}

export class UpdateListingDto extends PartialType(CreateListingDto) {}

export class UpdatePricingDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  packages?: any;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class ListingFilterDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @IsEnum(["sale", "investment", "both"])
  @IsOptional()
  listingType?: ListingType;
}
