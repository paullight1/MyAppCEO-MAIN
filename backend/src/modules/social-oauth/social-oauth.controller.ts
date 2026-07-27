import { Controller, Get, Query, UseGuards, Param, Delete, Request, BadRequestException } from '@nestjs/common';
import { SocialOauthService, SocialPlatform } from './social-oauth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Social OAuth')
@Controller('oauth')
export class SocialOauthController {
  constructor(private readonly oauthService: SocialOauthService) {}

  @Get(':platform/connect')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get OAuth authorization URL for a platform' })
  async getAuthUrl(
    @Request() req: any,
    @Param('platform') platform: string,
    @Query('appId') appId: string,
  ) {
    if (!['meta', 'tiktok', 'twitter'].includes(platform)) {
      throw new BadRequestException('Invalid platform. Use: meta, tiktok, or twitter');
    }
    if (!appId) {
      throw new BadRequestException('appId query parameter is required');
    }
    const url = await this.oauthService.getAuthorizationUrl(
      platform as SocialPlatform,
      appId,
      req.user.id,
    );
    return { authUrl: url };
  }

  @Get(':platform/callback')
  @ApiOperation({ summary: 'Handle OAuth callback from platform' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: true })
  async handleCallback(
    @Param('platform') platform: string,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    if (!['meta', 'tiktok', 'twitter'].includes(platform)) {
      throw new BadRequestException('Invalid platform. Use: meta, tiktok, or twitter');
    }
    return this.oauthService.handleCallback(platform as SocialPlatform, code, state);
  }

  @Delete('accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disconnect a social media account' })
  disconnectAccount(@Request() req: any, @Param('accountId') accountId: string) {
    return this.oauthService.disconnectAccount(accountId, req.user.id);
  }

  @Get('accounts/:appId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all connected accounts for an app' })
  getConnectedAccounts(@Request() req: any, @Param('appId') appId: string) {
    return this.oauthService.getConnectedAccounts(appId, req.user.id);
  }
}