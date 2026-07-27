import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class UpdateOfferStatusDto {
  @ApiProperty({ enum: ['accepted', 'rejected', 'withdrawn'] })
  @IsIn(['accepted', 'rejected', 'withdrawn'])
  status: 'accepted' | 'rejected' | 'withdrawn';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class CounterOfferDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class RespondToCounterOfferDto {
  @ApiProperty({ enum: ['accepted', 'rejected'] })
  @IsIn(['accepted', 'rejected'])
  response: 'accepted' | 'rejected';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
