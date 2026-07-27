import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { TelemetryService } from './telemetry.service';
import { ForecastingService } from './forecasting.service';

@Module({
  controllers: [AnalyticsController],
  providers: [TelemetryService, ForecastingService],
  exports: [TelemetryService, ForecastingService],
})
export class AnalyticsModule {}
