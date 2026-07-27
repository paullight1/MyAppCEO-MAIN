import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppStoreService } from './app-store.service';
import { AppStoreMetricsService } from './app-store-metrics.service';
import { ConnectAppStoreDto } from './dto/connect-app-store.dto';

@ApiTags('App Store Connect')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations/app-store')
export class AppStoreController {
  constructor(
    private readonly appStore: AppStoreService,
    private readonly metrics: AppStoreMetricsService,
  ) {}

  @Post('connect')
  @ApiOperation({ summary: 'Validate and store App Store Connect API credentials for an app' })
  connect(@Request() req: any, @Body() dto: ConnectAppStoreDto) {
    return this.appStore.connect(dto, req.user.id);
  }

  @Get(':appId')
  @ApiOperation({ summary: 'Get the App Store Connect connection for an app (no secrets)' })
  getConnection(@Request() req: any, @Param('appId', ParseUUIDPipe) appId: string) {
    return this.appStore.getConnection(appId, req.user.id);
  }

  @Post(':appId/sync')
  @ApiOperation({ summary: 'Re-verify the stored key and refresh cached metadata' })
  sync(@Request() req: any, @Param('appId', ParseUUIDPipe) appId: string) {
    return this.appStore.sync(appId, req.user.id);
  }

  @Delete(':appId')
  @ApiOperation({ summary: 'Disconnect App Store Connect for an app' })
  disconnect(@Request() req: any, @Param('appId', ParseUUIDPipe) appId: string) {
    return this.appStore.disconnect(appId, req.user.id);
  }

  @Post(':appId/metrics/sync')
  @ApiOperation({ summary: 'Pull the latest downloads, proceeds, and ratings from App Store Connect' })
  syncMetrics(@Request() req: any, @Param('appId', ParseUUIDPipe) appId: string) {
    return this.metrics.syncMetrics(appId, req.user.id);
  }

  @Get(':appId/metrics')
  @ApiOperation({ summary: 'Read stored App Store metric snapshots for an app' })
  getMetrics(@Request() req: any, @Param('appId', ParseUUIDPipe) appId: string) {
    return this.metrics.getMetrics(appId, req.user.id);
  }
}
