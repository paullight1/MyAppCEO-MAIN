import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppsService } from './apps.service';
import { CreateManagedAppDto, InviteCoownerDto, UpdateCoownerDto, UpdateCoownerStatusDto } from './dto/managed-app.dto';

@ApiTags('Apps')
@Controller('apps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get apps owned or joined by the current user' })
  findMine(@CurrentUser() user: any) {
    return this.appsService.findMine(user.id);
  }

  @Post('managed')
  @ApiOperation({ summary: 'Create a managed app workspace from existing app intake' })
  createManagedApp(
    @Body() dto: CreateManagedAppDto,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.appsService.createManagedApp(dto, user.id, idempotencyKey);
  }

  @Get('coowners/pending')
  @ApiOperation({ summary: 'Get pending ownership invitations for the current user' })
  getPendingCoownerInvites(@CurrentUser() user: any) {
    return this.appsService.getPendingCoownerInvites(user.id, user.email);
  }

  @Patch('coowners/:coownerId')
  @ApiOperation({ summary: 'Update an app co-owner invite' })
  updateCoowner(
    @Param('coownerId') coownerId: string,
    @Body() dto: UpdateCoownerDto,
    @CurrentUser() user: any,
  ) {
    return this.appsService.updateCoowner(coownerId, dto, user.id);
  }

  @Patch('coowners/:coownerId/status')
  @ApiOperation({ summary: 'Accept, decline, or withdraw a co-owner invite' })
  updateCoownerStatus(
    @Param('coownerId') coownerId: string,
    @Body() dto: UpdateCoownerStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.appsService.updateCoownerStatus(coownerId, dto.status, user.id, user.email);
  }

  @Get(':appId/coowners')
  @ApiOperation({ summary: 'Get co-founders and ownership invitees for an app' })
  getCoowners(@Param('appId') appId: string, @CurrentUser() user: any) {
    return this.appsService.getCoowners(appId, user.id);
  }

  @Post(':appId/coowners')
  @ApiOperation({ summary: 'Invite a co-founder or owner to an app' })
  inviteCoowner(
    @Param('appId') appId: string,
    @Body() dto: InviteCoownerDto,
    @CurrentUser() user: any,
  ) {
    return this.appsService.inviteCoowner(appId, dto, user.id);
  }

  @Delete(':appId/coowners/:coownerId')
  @ApiOperation({ summary: 'Withdraw or remove an app ownership invite' })
  removeCoowner(
    @Param('appId') appId: string,
    @Param('coownerId') coownerId: string,
    @CurrentUser() user: any,
  ) {
    return this.appsService.removeCoowner(appId, coownerId, user.id);
  }
}
