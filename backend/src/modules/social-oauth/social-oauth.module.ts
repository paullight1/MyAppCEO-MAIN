import { Module } from '@nestjs/common';
import { SocialOauthController } from './social-oauth.controller';
import { SocialOauthService } from './social-oauth.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialOauthController],
  providers: [SocialOauthService],
  exports: [SocialOauthService],
})
export class SocialOauthModule {}