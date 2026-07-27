import { Controller, Get, Post, Delete, Body, UseGuards, Request, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { CeoControlService } from './ceo-control.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';

@ApiTags('CEO Control')
@Controller('ceo-control')
export class CeoControlController {
  constructor(private readonly ceoControlService: CeoControlService) {}

  // --- Key Management (For Dashboard) ---

  @UseGuards(JwtAuthGuard)
  @Post('keys')
  @ApiOperation({ summary: 'Generate a new CEO Control API Key' })
  generateKey(@Request() req: any, @Body() body: { appId?: string, name: string }) {
    return this.ceoControlService.generateApiKey(req.user.id, body.appId ?? null, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('keys')
  @ApiOperation({ summary: 'List all CEO Control API Keys' })
  listKeys(@Request() req: any) {
    return this.ceoControlService.listApiKeys(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('keys/:id')
  @ApiOperation({ summary: 'Revoke an API Key' })
  revokeKey(@Request() req: any, @Param('id') id: string) {
    return this.ceoControlService.revokeApiKey(req.user.id, id);
  }

  // --- Actual CEO Control Endpoints (Using API Key) ---

  @Get('stats/:appId')
  @ApiOperation({ summary: 'Get app statistics using CEO API Key' })
  async getStats(
    @Param('appId') appId: string,
    @Headers('x-mvplab-api-key') apiKey: string
  ) {
    if (!apiKey) throw new UnauthorizedException('Missing API Key');
    await this.ceoControlService.validateApiKeyForApp(apiKey, appId);
    return this.ceoControlService.getAppStats(appId);
  }

  @Get('app/:appId/lifecycle')
  @ApiOperation({ summary: 'Get app development lifecycle progress' })
  async getLifecycle(
    @Param('appId') appId: string,
    @Headers('x-mvplab-api-key') apiKey: string
  ) {
    if (!apiKey) throw new UnauthorizedException('Missing API Key');
    await this.ceoControlService.validateApiKeyForApp(apiKey, appId);
    return this.ceoControlService.getLifecycle(appId);
  }

  @Post('app/:appId/alerts')
  @ApiOperation({ summary: 'Trigger an alert/notification for a specific app' })
  async triggerAlert(
    @Param('appId') appId: string,
    @Headers('x-mvplab-api-key') apiKey: string,
    @Body() body: { issue: string, severity: string }
  ) {
    if (!apiKey) throw new UnauthorizedException('Missing API Key');
    await this.ceoControlService.validateApiKeyForApp(apiKey, appId);
    return this.ceoControlService.triggerAlert(appId, body.issue, body.severity);
  }

  // --- Admin/Management Endpoints ---

  @UseGuards(JwtAuthGuard)
  @Post('app/:appId/lifecycle/update')
  @ApiOperation({ summary: 'Admin: Update app progress' })
  updateProgress(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body() body: { stepId: string, percentage: number }
  ) {
    // In a real app, we'd check if req.user.role === 'admin'
    return this.ceoControlService.updateLifecycle(appId, body.stepId, body.percentage, req.user.id);
  }
}
