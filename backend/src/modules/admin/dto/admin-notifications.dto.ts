import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdminNotificationUsersQueryDto {
  @ApiPropertyOptional({ default: 500 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 500;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}

export class AdminNotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  @IsOptional()
  limit?: number = 100;
}

export class SendAdminNotificationDto {
  @ApiProperty({ enum: ['all', 'specific', 'role'] })
  @IsIn(['all', 'specific', 'role'])
  targetType: 'all' | 'specific' | 'role';

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  showPopup?: boolean;
}

export class MarkAdminNotificationDto {
  @ApiProperty()
  @IsBoolean()
  read: boolean;
}
