import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const getRequiredJwtSecret = (configService: ConfigService): string => {
  const secret = configService.get<string>('JWT_SECRET')?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtSecret(configService),
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
