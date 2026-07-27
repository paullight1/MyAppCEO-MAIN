import { IsString, IsOptional, IsUrl } from 'class-validator';

export class ConnectAccountDto {
  @IsString()
  platform: string;

  @IsString()
  platformUserId: string;

  @IsString()
  accessToken: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
