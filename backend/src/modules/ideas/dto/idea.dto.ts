import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsNumber, Min, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum AppCategory {
  MOBILE_APP = 'mobile_app',
  WEB_APP = 'web_app',
  GAME = 'game',
  SAAS = 'saas',
  AI_PRODUCT = 'ai_product',
  BROWSER_EXTENSION = 'browser_extension',
  MARKETPLACE = 'marketplace',
  SOCIAL = 'social',
  PRODUCTIVITY = 'productivity',
  OTHER = 'other',
}

export enum AppPlatform {
  MOBILE = 'mobile',
  WEB = 'web',
  DESKTOP = 'desktop',
  CROSS_PLATFORM = 'cross_platform',
}

export enum IdeaStatus {
  DRAFT = 'draft',
  PRD_GENERATING = 'prd_generating',
  PRD_GENERATED = 'prd_generated',
  DESIGNING = 'designing',
  DESIGN_COMPLETE = 'design_complete',
  ESTIMATING = 'estimating',
  READY_FOR_FUNDING = 'ready_for_funding',
  SUBMITTED_FOR_FUNDING = 'submitted_for_funding',
  ARCHIVED = 'archived',
  CONVERTED_TO_APP = 'converted_to_app',
}

export class FeatureDto {
  @ApiProperty({ example: 'User Authentication' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Allow users to sign up and log in' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'must_have', enum: ['must_have', 'should_have', 'nice_to_have'] })
  @IsEnum(['must_have', 'should_have', 'nice_to_have'])
  priority: string;
}

export class CreateIdeaDto {
  @ApiProperty({ example: 'TaskMaster Pro' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 120)
  title: string;

  @ApiProperty({ example: 'A task management app with AI-powered prioritization' })
  @IsString()
  @IsNotEmpty()
  @Length(20, 5000)
  description: string;

  @ApiPropertyOptional({ enum: AppCategory, default: AppCategory.OTHER })
  @IsEnum(AppCategory)
  @IsOptional()
  category?: AppCategory;

  @ApiPropertyOptional({ enum: AppPlatform, default: AppPlatform.MOBILE })
  @IsEnum(AppPlatform)
  @IsOptional()
  platform?: AppPlatform;

  @ApiPropertyOptional({ example: 'Busy professionals and teams' })
  @IsString()
  @IsOptional()
  @Length(0, 1000)
  targetAudience?: string;

  @ApiPropertyOptional({ type: [FeatureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureDto)
  @IsOptional()
  features?: FeatureDto[];
}

export class UpdateIdeaDto extends PartialType(CreateIdeaDto) {
  @ApiPropertyOptional({ enum: IdeaStatus })
  @IsEnum(IdeaStatus)
  @IsOptional()
  status?: IdeaStatus;
}

export class GeneratePRDDto {
  @ApiPropertyOptional({ example: 'prd-idea-prompt-v1' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'prd-prompt-v1' })
  @IsString()
  @IsOptional()
  promptVersion?: string;

  @ApiPropertyOptional({ example: 'Focus on collaboration features' })
  @IsString()
  @IsOptional()
  additionalContext?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  includeTechnicalSpecs?: boolean;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  targetTimelineWeeks?: number;
}

export class PatchPRDNodeDto {
  @ApiPropertyOptional({ example: 'Dashboard' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: 'Primary workspace for tracking operational metrics' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['approved', 'pending', 'needs_review'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  dependencies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  acceptanceCriteria?: string[];

  @ApiPropertyOptional({ example: 'screen-dashboard' })
  @IsString()
  @IsOptional()
  screenId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  apiContracts?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  dataEntities?: string[];

  @ApiPropertyOptional({ enum: ['ready', 'missing_requirements', 'needs_review'] })
  @IsString()
  @IsOptional()
  validationStatus?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  reviewNotes?: string[];
}

export class RefinePRDNodeDto {
  @ApiPropertyOptional({ example: 'Clarify acceptance criteria and API contracts' })
  @IsString()
  @IsOptional()
  instructions?: string;
}

export class ExpandPRDNodeDto extends RefinePRDNodeDto {}

export class GenerateDesignsDto {
  @ApiPropertyOptional({ enum: ['modern', 'minimal', 'playful', 'professional'], default: 'modern' })
  @IsEnum(['modern', 'minimal', 'playful', 'professional'])
  @IsOptional()
  style?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: ['phone', 'tablet', 'web'] })
  @IsArray()
  @IsOptional()
  deviceTypes?: string[];

  @ApiPropertyOptional({ example: ['Home', 'Dashboard', 'Settings'] })
  @IsArray()
  @IsOptional()
  screens?: string[];
}

export class EstimateCostDto {
  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  timelineWeeks?: number;

  @ApiPropertyOptional({ enum: ['us', 'eu', 'asia', 'mixed'], default: 'mixed' })
  @IsEnum(['us', 'eu', 'asia', 'mixed'])
  @IsOptional()
  teamLocation?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  includeMaintenance?: boolean;
}

export class IdeaFilterDto {
  @ApiPropertyOptional({ enum: AppCategory })
  @IsEnum(AppCategory)
  @IsOptional()
  category?: AppCategory;

  @ApiPropertyOptional({ enum: AppPlatform })
  @IsEnum(AppPlatform)
  @IsOptional()
  platform?: AppPlatform;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}
