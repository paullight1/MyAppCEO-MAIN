import { Module } from '@nestjs/common';
import { ExternalAppsController } from './external-apps.controller';
import { ExternalAppsService } from './external-apps.service';

@Module({
  controllers: [ExternalAppsController],
  providers: [ExternalAppsService],
})
export class ExternalAppsModule {}

