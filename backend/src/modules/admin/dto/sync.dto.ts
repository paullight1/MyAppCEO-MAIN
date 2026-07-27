import { IsString, IsObject, IsUUID, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SyncActionType {
  GROWTH_ALERT = 'GROWTH_ALERT',
  PRICE_CHANGE = 'PRICE_CHANGE',
  OPTIMIZATION_REQUEST = 'OPTIMIZATION_REQUEST',
  IMPROVEMENT_SUGGESTION = 'IMPROVEMENT_SUGGESTION',
  MARKETING_BUDGET_UPDATE = 'MARKETING_BUDGET_UPDATE',
  REVENUE_MILESTONE = 'REVENUE_MILESTONE',
  USER_THRESHOLD_ALERT = 'USER_THRESHOLD_ALERT',
  BUG_REPORT = 'BUG_REPORT',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
}

export class GrowthAlertMetadata {
  @ApiProperty()
  currentGrowth: number;

  @ApiProperty()
  targetGrowth: number;

  @ApiProperty()
  timeframe: string;

  @ApiPropertyOptional()
  suggestedActions?: string[];
}

export class PriceChangeMetadata {
  @ApiProperty()
  currentPrice: number;

  @ApiProperty()
  suggestedPrice: number;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  marketData?: Record<string, any>;
}

export class OptimizationRequestMetadata {
  @ApiProperty()
  area: 'performance' | 'marketing' | 'retention' | 'revenue';

  @ApiProperty()
  priority: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  metrics?: Record<string, any>;
}

export class ImprovementSuggestionMetadata {
  @ApiProperty()
  category: string;

  @ApiProperty()
  suggestion: string;

  @ApiProperty()
  impact: 'low' | 'medium' | 'high';

  @ApiPropertyOptional()
  implementationEffort?: string;
}

export class MarketplaceSyncDto {
  @ApiProperty({ description: 'UUID of the app' })
  @IsUUID()
  appId: string;

  @ApiProperty({ enum: SyncActionType })
  @IsEnum(SyncActionType)
  actionType: SyncActionType;

  @ApiProperty({ description: 'Metadata specific to the action type' })
  @IsObject()
  metadata:
    | GrowthAlertMetadata
    | PriceChangeMetadata
    | OptimizationRequestMetadata
    | ImprovementSuggestionMetadata
    | Record<string, any>;

  @ApiPropertyOptional({ description: 'UUID of the user who triggered the sync' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Source system that triggered the sync' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Timestamp of the event' })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Idempotency key for deduplication' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class SyncResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  received: boolean;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  processedAt?: string;

  @ApiPropertyOptional()
  actionId?: string;
}