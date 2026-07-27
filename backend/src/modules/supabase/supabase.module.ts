import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_ADMIN = 'SUPABASE_ADMIN';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('SUPABASE_URL');
        const key = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
        if (!url || !key) {
          throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        }

        return createClient(url, key, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      },
    },
  ],
  exports: [SUPABASE_ADMIN],
})
export class SupabaseModule {}
