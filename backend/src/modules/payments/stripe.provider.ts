import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const StripeProvider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const secretKey = configService.get<string>('STRIPE_SECRET_KEY');
    return new Stripe(secretKey || '', {
      apiVersion: '2025-01-27.acacia' as any, // Use the latest supported or required version
    });
  },
};
