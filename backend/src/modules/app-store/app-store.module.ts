import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppStoreController } from './app-store.controller';
import { AppStoreService } from './app-store.service';
import { AppStoreMetricsService } from './app-store-metrics.service';

@Module({
  // DatabaseModule (DRIZZLE) and CryptoModule (TokenCryptoService) are @Global.
  // JwtModule provides JwtService for ES256 App Store Connect token signing;
  // the signing key is supplied per-call, so no global secret is configured.
  imports: [JwtModule.register({})],
  controllers: [AppStoreController],
  providers: [AppStoreService, AppStoreMetricsService],
  exports: [AppStoreService, AppStoreMetricsService],
})
export class AppStoreModule {}
