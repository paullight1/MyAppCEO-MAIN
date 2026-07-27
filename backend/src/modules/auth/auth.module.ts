import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseStrategy } from './strategies/supabase.strategy';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    UsersModule,
    SupabaseModule,
    PassportModule.register({ defaultStrategy: 'supabase' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, SupabaseStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
