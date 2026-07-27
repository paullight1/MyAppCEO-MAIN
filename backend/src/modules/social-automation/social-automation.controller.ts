import { Controller, Get, Post, Body, UseGuards, Request, Param, Patch, UsePipes, ValidationPipe } from '@nestjs/common';
import { SocialAutomationService } from './social-automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { HireTalentDto } from './dto/hire-talent.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Social Automation')
@Controller('social-automation')
@UseGuards(JwtAuthGuard)
export class SocialAutomationController {
  constructor(private readonly socialAutomationService: SocialAutomationService) {}

  @Post('accounts/:appId')
  @ApiOperation({ summary: 'Connect a social media account to an app' })
  @UsePipes(new ValidationPipe({ transform: true }))
  connectAccount(@Param('appId') appId: string, @Body() body: ConnectAccountDto) {
    return this.socialAutomationService.connectAccount(appId, body);
  }

  @Get('accounts/:appId')
  @ApiOperation({ summary: 'List all connected social accounts for an app' })
  getAccounts(@Param('appId') appId: string) {
    return this.socialAutomationService.getAccounts(appId);
  }

  @Post('rules/:appId')
  @ApiOperation({ summary: 'Create a new automation rule (e.g. ManyChat keyword reply)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  createRule(@Param('appId') appId: string, @Body() body: CreateRuleDto) {
    return this.socialAutomationService.createRule(appId, body);
  }

  @Get('rules/:appId')
  @ApiOperation({ summary: 'Get all automation rules for an app' })
  getRules(@Param('appId') appId: string) {
    return this.socialAutomationService.getRules(appId);
  }

  @Patch('rules/:id/status')
  @ApiOperation({ summary: 'Toggle an automation rule status' })
  toggleRule(@Param('id') id: string, @Body() body: { status: 'active' | 'paused' }) {
    return this.socialAutomationService.toggleRule(id, body.status);
  }

  @Post('webhook/simulate')
  @ApiOperation({ summary: 'Simulate an incoming message for testing automations' })
  simulateMessage(@Body() body: { platform: string, platformUserId: string, message: string }) {
    return this.socialAutomationService.processIncomingMessage(body.platform, body.platformUserId, body.message);
  }

  // --- Talent Hiring ---
  @Post('hire/:talentId')
  @ApiOperation({ summary: 'Hire a UGC talent for an app/campaign' })
  @UsePipes(new ValidationPipe({ transform: true }))
  hireTalent(@CurrentUser() user: any, @Param('talentId') talentId: string, @Body() body: HireTalentDto) {
    return this.socialAutomationService.hireTalent(user.id, body.appId, talentId, body);
  }

  @Get('hire-requests')
  @ApiOperation({ summary: 'List all talent hire requests sent by the CEO' })
  getHireRequests(@CurrentUser() user: any) {
    return this.socialAutomationService.getHireRequests(user.id);
  }
}
