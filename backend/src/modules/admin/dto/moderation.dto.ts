import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum ModerationItemType {
  LISTING = 'listing',
  GENERATED_CODE = 'generated_code',
  APP_SUBMISSION = 'app_submission',
  TALENT_PORTFOLIO = 'talent_portfolio',
  UGC_SUBMISSION = 'ugc_submission',
  UGC = 'ugc',
  LEGAL_APPLICATION = 'legal_application',
  PAYOUT = 'payout',
  KYC = 'kyc',
}

export enum ModerationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  PAUSE = 'pause',
  CHANGES_REQUESTED = 'changes_requested',
  ARCHIVE = 'archive',
}

export enum GeneratedReviewReason {
  MISSING_QUALITY_REPORT = 'missing_quality_report',
  FAILED_SANDBOX = 'failed_sandbox',
  MISSING_REPO_LINK = 'missing_repo_link',
  MISSING_PREVIEW = 'missing_preview',
  INCOMPLETE_PRD_MAPPING = 'incomplete_prd_mapping',
  SECURITY_RISK = 'security_risk',
  OTHER = 'other',
}

export const GeneratedReviewReasonLabels: Record<GeneratedReviewReason, string> = {
  [GeneratedReviewReason.MISSING_QUALITY_REPORT]: 'Missing quality report',
  [GeneratedReviewReason.FAILED_SANDBOX]: 'Failed sandbox',
  [GeneratedReviewReason.MISSING_REPO_LINK]: 'Missing repo link',
  [GeneratedReviewReason.MISSING_PREVIEW]: 'Missing preview',
  [GeneratedReviewReason.INCOMPLETE_PRD_MAPPING]: 'Incomplete PRD mapping',
  [GeneratedReviewReason.SECURITY_RISK]: 'Security risk',
  [GeneratedReviewReason.OTHER]: 'Other',
};

export enum ModerationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class ModerationQueueQueryDto {
  @ApiPropertyOptional({ enum: ModerationItemType })
  @IsEnum(ModerationItemType)
  @IsOptional()
  type?: ModerationItemType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ModerationPriority })
  @IsEnum(ModerationPriority)
  @IsOptional()
  priority?: ModerationPriority;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

export class ModerationDecisionDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: ModerationItemType })
  @IsEnum(ModerationItemType)
  itemType: ModerationItemType;

  @ApiProperty({ enum: ModerationAction })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional({
    enum: GeneratedReviewReason,
    description: 'Structured reason for generated_code/app_submission decisions. Listings may still use free text.',
  })
  @IsString()
  @IsOptional()
  reason?: GeneratedReviewReason | string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkApproveDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @ApiProperty({ enum: ModerationItemType })
  @IsEnum(ModerationItemType)
  itemType: ModerationItemType;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}
