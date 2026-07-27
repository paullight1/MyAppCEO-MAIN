import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  recipientId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  listingId?: string;

  @ApiProperty()
  @IsString()
  content: string;
}
