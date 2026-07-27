import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

export class HireTalentDto {
  @IsUUID()
  appId: string;

  @IsString()
  proposal: string;

  @IsNumber()
  @Min(0)
  budget: number;

  @IsUUID()
  @IsOptional()
  campaignId?: string;
}
