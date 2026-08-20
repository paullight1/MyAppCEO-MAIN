import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  // TEMPORARY red-proof regression: restored immediately after CI proves the
  // security test fails when public registration accepts role again.
  @IsString()
  @IsOptional()
  role?: string;
}
