import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max, IsBoolean, IsArray, IsUUID } from 'class-validator';

export enum FundingType {
  PAY_ONCE = 'pay_once',
  SPLIT = 'split',
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'TaskMaster Pro - Crowdfunding Campaign' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Help us build the next great productivity app' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Full campaign description...' })
  @IsString()
  @IsOptional()
  longDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=xxx' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1000)
  fundingGoal: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(10)
  minInvestment?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsNumber()
  @IsOptional()
  maxInvestment?: number;

  @ApiProperty({ example: 30, description: 'Percentage of equity being offered' })
  @IsNumber()
  @Min(1)
  @Max(100)
  equityOfferedPct: number;

  @ApiProperty({ example: 100000, description: 'Pre-money valuation in USD' })
  @IsNumber()
  @Min(10000)
  preMoneyValuation: number;

  @ApiPropertyOptional({ enum: FundingType, default: FundingType.SPLIT })
  @IsEnum(FundingType)
  @IsOptional()
  fundingType?: FundingType;

  @ApiPropertyOptional({ example: 30, description: 'Campaign duration in days' })
  @IsNumber()
  @IsOptional()
  @Min(7)
  @Max(90)
  durationDays?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  maxInvestors?: number;

  @ApiPropertyOptional({ example: 'uuid-of-idea' })
  @IsUUID()
  @IsOptional()
  ideaId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-app' })
  @IsUUID()
  @IsOptional()
  appId?: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class InvestDto {
  @ApiProperty({ example: 5000, description: 'Investment amount in major currency units, matching PAYSTACK_CURRENCY' })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ example: 'authorization_code', description: 'Optional provider payment method or authorization ID' })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiPropertyOptional({ example: 'https://app.mvplab.com/invest/success' })
  @IsString()
  @IsOptional()
  returnUri?: string;
}

export class ConfirmInvestmentDto {
  @ApiProperty({ example: 'uuid-of-commitment' })
  @IsUUID()
  commitmentId: string;

  @ApiPropertyOptional({ example: 'PSK_reference' })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({ example: 'pi_xxx', deprecated: true })
  @IsString()
  @IsOptional()
  paymentIntentId?: string;
}

export class CreateShareLinkDto {
  @ApiPropertyOptional({ enum: ['public', 'private', 'single_use'], default: 'public' })
  @IsEnum(['public', 'private', 'single_use'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 7, description: 'Days until link expires' })
  @IsNumber()
  @IsOptional()
  expiresInDays?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum uses (for single_use type)' })
  @IsNumber()
  @IsOptional()
  maxUses?: number;
}

export class CampaignFilterDto {
  @ApiPropertyOptional({ enum: ['active', 'funded', 'draft'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @IsOptional()
  minGoal?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsNumber()
  @IsOptional()
  maxGoal?: number;
}

export class CalculateStakeDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100)
  amount: number;
}
