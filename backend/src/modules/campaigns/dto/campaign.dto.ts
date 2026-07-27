import { IsString, IsOptional, IsEnum, IsNumber, IsUUID, IsDateString, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsUUID()
  appId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  goalType?: string;

  @IsNumber()
  @Min(1)
  goalValue: number;

  @IsNumber()
  @Min(0)
  totalBudget: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  creatives?: any;
}

export class UpdateCampaignStatusDto {
  @IsEnum(['draft', 'active', 'paused', 'completed', 'cancelled'])
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
}
