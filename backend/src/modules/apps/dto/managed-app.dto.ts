import { IsBoolean, IsEmail, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUrl, Min, Max } from 'class-validator';

export class CreateManagedAppDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assetType?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  stage?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  websiteUrl?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  playStoreUrl?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  appStoreUrl?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  otherStoreUrl?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  repoUrl?: string;

  @IsString()
  @IsOptional()
  techStack?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRevenue?: number;

  @IsString()
  @IsOptional()
  users?: string;

  @IsObject()
  @IsOptional()
  storeMetadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsBoolean()
  ownerConfirmed: boolean;

  @IsBoolean()
  dataConfirmed: boolean;

  @IsBoolean()
  termsAccepted: boolean;
}

export class InviteCoownerDto {
  @IsEmail()
  email: string;

  @IsString()
  role: string;

  @IsNumber()
  @Min(0.1)
  @Max(100)
  equityPct: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  vestingMonths?: number;
}

export class UpdateCoownerDto {
  @IsString()
  @IsOptional()
  role?: string;

  @IsNumber()
  @Min(0.1)
  @Max(100)
  @IsOptional()
  equityPct?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  vestingMonths?: number;
}

export class UpdateCoownerStatusDto {
  @IsString()
  @IsIn(['accepted', 'declined', 'departed'])
  status: 'accepted' | 'declined' | 'departed';
}
