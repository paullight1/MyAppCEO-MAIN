import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ExternalAppSearchDto, STORE_PLATFORMS } from './dto/external-apps.dto';
import type { StorePlatform } from './dto/external-apps.dto';
import {
  ExternalAppsService,
  ExternalCatalogResult,
  ExternalStoreApp,
} from './external-apps.service';

@ApiTags('External App Catalog')
@Controller('external-apps')
export class ExternalAppsController {
  constructor(private readonly externalAppsService: ExternalAppsService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('search')
  @ApiOperation({ summary: 'Search live external app stores for real app metadata' })
  async search(@Query() query: ExternalAppSearchDto): Promise<ExternalCatalogResult> {
    return this.externalAppsService.search(query);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get(':platform/:id')
  @ApiOperation({ summary: 'Get one external app by platform and store ID' })
  async findOne(
    @Param('platform') platform: string,
    @Param('id') id: string,
    @Query('country') country?: string,
  ): Promise<ExternalStoreApp> {
    if (!STORE_PLATFORMS.includes(platform as StorePlatform) || platform === 'all') {
      throw new BadRequestException('Platform must be ios or android');
    }

    return this.externalAppsService.findOne(platform as StorePlatform, id, country);
  }
}
