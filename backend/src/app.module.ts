import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OffersModule } from './modules/offers/offers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagesModule } from './modules/messages/messages.module';
import { CeoControlModule } from './modules/ceo-control/ceo-control.module';
import { SocialAutomationModule } from './modules/social-automation/social-automation.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { MediaModule } from './modules/media/media.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AIModule } from './modules/ai/ai.module';
import { SearchModule } from './modules/search/search.module';
import { IdeasModule } from './modules/ideas/ideas.module';
import { CrowdfundingModule } from './modules/crowdfunding/crowdfunding.module';
import { DevelopmentModule } from './modules/development/development.module';
import { DesignsModule } from './modules/designs/designs.module';
import { SocialOauthModule } from './modules/social-oauth/social-oauth.module';
import { CommunityModule } from './modules/community/community.module';
import { VideoPostModule } from './modules/video-post/video-post.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { AutomationModule } from './modules/automation/automation.module';
import { ExternalAppsModule } from './modules/external-apps/external-apps.module';
import { CacheModule } from './common/cache/cache.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AppsModule } from './modules/apps/apps.module';
import { GenerationModule } from './modules/generation/generation.module';
import { FinancesModule } from './modules/finances/finances.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { AppStoreModule } from './modules/app-store/app-store.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    CacheModule,
    CryptoModule,
    DatabaseModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    MarketplaceModule,
    AnalyticsModule,
    CampaignsModule,
    AdminModule,
    OffersModule,
    NotificationsModule,
    MessagesModule,
    CeoControlModule,
    SocialAutomationModule,
    CreatorsModule,
    MediaModule,
    PaymentsModule,
    AIModule,
    SearchModule,
    IdeasModule,
    CrowdfundingModule,
    DevelopmentModule,
    DesignsModule,
    SocialOauthModule,
    CommunityModule,
    VideoPostModule,
    SchedulerModule,
    AutomationModule,
    ExternalAppsModule,
    AppsModule,
    GenerationModule,
    FinancesModule,
    EscrowModule,
    WatchlistModule,
    AppStoreModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
