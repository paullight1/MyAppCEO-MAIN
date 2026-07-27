import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';
import { SupabaseClient } from '@supabase/supabase-js';
import { ACCESS_TOKEN_COOKIE, readCookie } from '../auth-cookies';

const getRequiredJwtSecret = (configService: ConfigService): string => {
  const secret = configService.get<string>('JWT_SECRET')?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
};

// Prefer the httpOnly cookie (broker sessions); fall back to the Authorization
// header so existing Bearer-token clients keep working during migration.
const cookieOrBearerExtractor: JwtFromRequestFunction = (req: Request) => {
  const fromCookie = readCookie(req, ACCESS_TOKEN_COOKIE);
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(
    configService: ConfigService,
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtSecret(configService),
    });
  }

  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException();
    }

    const { data: profile } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', payload.sub)
      .maybeSingle();

    const role = profile?.role || payload.app_metadata?.role || 'ceo';
    const roles = Array.isArray(payload.app_metadata?.roles)
      ? payload.app_metadata.roles
      : [role];

    return {
      id: payload.sub,
      email: payload.email,
      role,
      roles,
    };
  }
}
