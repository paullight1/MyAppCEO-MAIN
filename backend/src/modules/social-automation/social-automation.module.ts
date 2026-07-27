import { Module } from '@nestjs/common';
import { SocialAutomationController } from './social-automation.controller';
import { SocialAutomationService } from './social-automation.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialAutomationController],
  providers: [SocialAutomationService],
  exports: [SocialAutomationService],
})
export class SocialAutomationModule {}
