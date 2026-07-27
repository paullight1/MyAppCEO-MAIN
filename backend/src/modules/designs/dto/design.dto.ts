import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandColorsDto {
  @ApiProperty()
  @IsString()
  primary: string;

  @ApiProperty()
  @IsString()
  secondary: string;

  @ApiProperty()
  @IsString()
  accent: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  background?: string;
}

export class GenerateDesignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ideaId?: string;

  @ApiProperty()
  @IsString()
  nodeId: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  children?: string[];

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => BrandColorsDto)
  @IsOptional()
  brandColors?: BrandColorsDto;

  @ApiPropertyOptional({ enum: ['mobile', 'web', 'tablet', 'desktop'] })
  @IsOptional()
  @IsEnum(['mobile', 'web', 'tablet', 'desktop'])
  platform?: 'mobile' | 'web' | 'tablet' | 'desktop' = 'mobile';

  @ApiPropertyOptional({ enum: ['modern', 'classic', 'minimal', 'playful'] })
  @IsOptional()
  @IsEnum(['modern', 'classic', 'minimal', 'playful'])
  style?: 'modern' | 'classic' | 'minimal' | 'playful';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promptVersion?: string;

  @ApiPropertyOptional({ enum: ['gemini', 'claude'] })
  @IsOptional()
  @IsEnum(['gemini', 'claude'])
  engine?: 'gemini' | 'claude';
}

export class BatchGenerateDesignsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ideaId?: string;

  @ApiProperty({ type: [GenerateDesignDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerateDesignDto)
  nodes: GenerateDesignDto[];

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => BrandColorsDto)
  @IsOptional()
  brandColors?: BrandColorsDto;

  @ApiPropertyOptional({ enum: ['mobile', 'web', 'tablet', 'desktop'] })
  @IsOptional()
  @IsEnum(['mobile', 'web', 'tablet', 'desktop'])
  platform?: 'mobile' | 'web' | 'tablet' | 'desktop' = 'mobile';

  @ApiPropertyOptional({ enum: ['modern', 'classic', 'minimal', 'playful'] })
  @IsOptional()
  @IsEnum(['modern', 'classic', 'minimal', 'playful'])
  style?: 'modern' | 'classic' | 'minimal' | 'playful';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promptVersion?: string;

  @ApiPropertyOptional({ enum: ['gemini', 'claude'] })
  @IsOptional()
  @IsEnum(['gemini', 'claude'])
  engine?: 'gemini' | 'claude';
}

export class DesignResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nodeId: string;

  @ApiProperty()
  imageUrl: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  screenName: string;

  @ApiProperty()
  screenType: string;

  @ApiProperty()
  createdAt: Date;
}
