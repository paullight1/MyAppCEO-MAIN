import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectAppStoreDto {
  @ApiProperty({ description: 'App this key is scoped to' })
  @IsUUID()
  appId: string;

  @ApiProperty({ description: 'Issuer ID (UUID) from Users and Access → Integrations' })
  @IsUUID()
  issuerId: string;

  @ApiProperty({ description: '10-character API Key ID', example: '2X9R4HXF34' })
  @Matches(/^[A-Z0-9]{10}$/i, { message: 'keyId must be a 10-character App Store Connect Key ID' })
  keyId: string;

  @ApiProperty({ description: 'Full PEM contents of the downloaded AuthKey_XXXXXXXXXX.p8 file' })
  @IsString()
  @Matches(/-----BEGIN PRIVATE KEY-----/, {
    message: 'privateKey must be the contents of the .p8 key file (PKCS#8 PEM)',
  })
  privateKey: string;

  @ApiPropertyOptional({ description: 'Vendor number for Sales & Finance reports' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'vendorNumber must be numeric' })
  @MaxLength(50)
  vendorNumber?: string;
}
