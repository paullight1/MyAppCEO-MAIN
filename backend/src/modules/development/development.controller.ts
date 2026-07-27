import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DevelopmentService } from './development.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePhaseDto,
  UpdatePhaseDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateProgressUpdateDto,
  CreateDeploymentDto,
  UpdateDeploymentDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
} from './dto/development.dto';

@Controller('development')
@UseGuards(OptionalJwtAuthGuard)
export class DevelopmentController {
  constructor(private readonly developmentService: DevelopmentService) {}

  @Post('apps/:appId/initialize')
  @UseGuards(JwtAuthGuard)
  async initializePhases(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Request() req: any,
  ) {
    return this.developmentService.initializeAppPhases(appId, req.user.id);
  }

  @Get('apps/:appId/progress')
  async getAppProgress(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.developmentService.getAppProgress(appId);
  }

  @Get('apps/:appId/phases')
  async getPhases(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.developmentService.getPhases(appId);
  }

  @Get('phases/:phaseId')
  async getPhase(@Param('phaseId', ParseUUIDPipe) phaseId: string) {
    return this.developmentService.getPhase(phaseId);
  }

  @Patch('phases/:phaseId')
  @UseGuards(JwtAuthGuard)
  async updatePhase(
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Body() dto: UpdatePhaseDto,
    @Request() req: any,
  ) {
    return this.developmentService.updatePhase(phaseId, dto, req.user.id);
  }

  @Post('phases/:phaseId/start')
  @UseGuards(JwtAuthGuard)
  async startPhase(
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Request() req: any,
  ) {
    return this.developmentService.startPhase(phaseId, req.user.id);
  }

  @Post('phases/:phaseId/complete')
  @UseGuards(JwtAuthGuard)
  async completePhase(
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Request() req: any,
  ) {
    return this.developmentService.completePhase(phaseId, req.user.id);
  }

  @Get('phases/:phaseId/milestones')
  async getMilestones(@Param('phaseId', ParseUUIDPipe) phaseId: string) {
    return this.developmentService.getMilestones(phaseId);
  }

  @Post('phases/:phaseId/milestones')
  @UseGuards(JwtAuthGuard)
  async createMilestone(
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Body() dto: CreateMilestoneDto,
    @Request() req: any,
  ) {
    const phase = await this.developmentService.getPhase(phaseId);
    return this.developmentService.createMilestone(phaseId, phase.appId, dto, req.user.id);
  }

  @Get('milestones/:milestoneId')
  async getMilestone(@Param('milestoneId', ParseUUIDPipe) milestoneId: string) {
    return this.developmentService.getMilestone(milestoneId);
  }

  @Patch('milestones/:milestoneId')
  @UseGuards(JwtAuthGuard)
  async updateMilestone(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @Request() req: any,
  ) {
    return this.developmentService.updateMilestone(milestoneId, dto, req.user.id);
  }

  @Post('milestones/:milestoneId/complete')
  @UseGuards(JwtAuthGuard)
  async completeMilestone(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Request() req: any,
  ) {
    return this.developmentService.completeMilestone(milestoneId, req.user.id);
  }

  @Post('milestones/:milestoneId/approve')
  @UseGuards(JwtAuthGuard)
  async approveMilestone(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Request() req: any,
  ) {
    return this.developmentService.approveMilestone(milestoneId, req.user.id);
  }

  @Post('milestones/:milestoneId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectMilestone(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.developmentService.rejectMilestone(milestoneId, reason, req.user.id);
  }

  @Get('milestones/:milestoneId/tasks')
  async getTasks(@Param('milestoneId', ParseUUIDPipe) milestoneId: string) {
    return this.developmentService.getTasks(milestoneId);
  }

  @Post('milestones/:milestoneId/tasks')
  @UseGuards(JwtAuthGuard)
  async createTask(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: CreateTaskDto,
    @Request() req: any,
  ) {
    return this.developmentService.createTask(milestoneId, dto, req.user.id);
  }

  @Patch('tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  async updateTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: any,
  ) {
    return this.developmentService.updateTask(taskId, dto, req.user.id);
  }

  @Get('apps/:appId/updates')
  async getProgressUpdates(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.developmentService.getProgressUpdates(
      appId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Post('apps/:appId/updates')
  @UseGuards(JwtAuthGuard)
  async createProgressUpdate(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: CreateProgressUpdateDto,
    @Request() req: any,
  ) {
    return this.developmentService.createProgressUpdate(appId, dto, req.user.id);
  }

  @Get('apps/:appId/deployments')
  async getDeployments(@Param('appId', ParseUUIDPipe) appId: string) {
    return this.developmentService.getDeployments(appId);
  }

  @Post('apps/:appId/deployments')
  @UseGuards(JwtAuthGuard)
  async createDeployment(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: CreateDeploymentDto,
    @Request() req: any,
  ) {
    return this.developmentService.createDeployment(appId, dto, req.user.id);
  }

  @Patch('deployments/:deploymentId')
  @UseGuards(JwtAuthGuard)
  async updateDeployment(
    @Param('deploymentId', ParseUUIDPipe) deploymentId: string,
    @Body() dto: UpdateDeploymentDto,
    @Request() req: any,
  ) {
    return this.developmentService.updateDeployment(deploymentId, dto, req.user.id);
  }

  @Get('apps/:appId/team')
  @UseGuards(JwtAuthGuard)
  async getTeam(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Request() req: any,
  ) {
    return this.developmentService.getTeam(appId, req.user.id);
  }

  @Post('apps/:appId/team')
  @UseGuards(JwtAuthGuard)
  async addTeamMember(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: AddTeamMemberDto,
    @Request() req: any,
  ) {
    return this.developmentService.addTeamMember(appId, dto, req.user.id);
  }

  @Patch('team/:memberId')
  @UseGuards(JwtAuthGuard)
  async updateTeamMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateTeamMemberDto,
    @Request() req: any,
  ) {
    return this.developmentService.updateTeamMember(memberId, dto, req.user.id);
  }

  @Delete('team/:memberId')
  @UseGuards(JwtAuthGuard)
  async removeTeamMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Request() req: any,
  ) {
    return this.developmentService.removeTeamMember(memberId, req.user.id);
  }

  @Get('investor/apps')
  @UseGuards(JwtAuthGuard)
  async getInvestorApps(@Request() req: any) {
    return this.developmentService.getInvestorApps(req.user.id);
  }

  @Get('investor/notifications')
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.developmentService.getNotifications(
      req.user.id,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('investor/notifications/:notificationId/read')
  @UseGuards(JwtAuthGuard)
  async markNotificationRead(
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
    @Request() req: any,
  ) {
    return this.developmentService.markNotificationRead(notificationId, req.user.id);
  }

  @Post('investor/notifications/read-all')
  @UseGuards(JwtAuthGuard)
  async markAllNotificationsRead(@Request() req: any) {
    return this.developmentService.markAllNotificationsRead(req.user.id);
  }
}