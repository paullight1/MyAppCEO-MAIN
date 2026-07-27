import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { ForecastingService } from './forecasting.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponse, DashboardOverview, ForecastScenario } from '../../../../packages/types/src';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly forecastingService: ForecastingService,
  ) {}

  @Get('overview/:appId')
  async getOverview(
    @Param('appId') appId: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponse<DashboardOverview>> {
    const data = await this.telemetryService.getAppOverview(appId, user.id);
    return {
      success: true,
      data,
    };
  }

  @Get('forecast/:appId')
  async getForecast(
    @Param('appId') appId: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponse<ForecastScenario[]>> {
    const overview = await this.telemetryService.getAppOverview(appId, user.id);
    const data = this.forecastingService.generate12MonthForecast(overview.mrr.value);
    return {
      success: true,
      data,
    };
  }
}
