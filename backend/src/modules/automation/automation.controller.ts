import { Controller, Get, Post, Body, UseGuards, Param, Patch, Delete, Request } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Automation')
@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new automation' })
  createAutomation(
    @Request() req: any,
    @Body() body: {
      appId: string;
      name: string;
      description?: string;
      flowData: any;
      triggers: Array<{ type: string; value?: string; platform?: string }>;
    },
  ) {
    return this.automationService.createAutomation(body);
  }

  @Get(':appId')
  @ApiOperation({ summary: 'Get all automations for an app' })
  getAutomations(@Param('appId') appId: string) {
    return this.automationService.getAutomations(appId);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get a specific automation' })
  getAutomation(@Param('id') id: string) {
    return this.automationService.getAutomation(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an automation' })
  updateAutomation(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      flowData?: any;
      triggers?: Array<{ type: string; value?: string; platform?: string }>;
    },
  ) {
    return this.automationService.updateAutomation(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an automation' })
  deleteAutomation(@Param('id') id: string) {
    return this.automationService.deleteAutomation(id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish/activate an automation' })
  publishAutomation(@Param('id') id: string) {
    return this.automationService.publishAutomation(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause an automation' })
  pauseAutomation(@Param('id') id: string) {
    return this.automationService.pauseAutomation(id);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Process incoming webhook from social platforms' })
  processWebhook(
    @Body() body: {
      platform: string;
      platformUserId: string;
      message: string;
      appId: string;
    },
  ) {
    return this.automationService.processWebhook(
      body.platform,
      body.platformUserId,
      body.message,
      body.appId,
    );
  }
}