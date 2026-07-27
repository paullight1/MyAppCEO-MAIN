import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerationRequestDto {
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  promptVersion?: string;
}

export class ScreenGenerationRequestDto extends GenerationRequestDto {
  @IsString()
  @IsOptional()
  viewport?: string;
}

export class SandboxRunRequestDto extends GenerationRequestDto {
  @IsString()
  @IsOptional()
  runner?: string;
}

export class ReviewSubmissionDto {
  @IsString()
  @IsOptional()
  artifactId?: string;

  @IsString()
  @IsOptional()
  qualityReportId?: string;

  @IsIn(['generated_code', 'app_submission'])
  @IsOptional()
  itemType?: 'generated_code' | 'app_submission';
}
