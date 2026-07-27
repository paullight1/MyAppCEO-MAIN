import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ModerationService } from './services/moderation.service';
import { AuditLogService } from './services/audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { AdminRole } from './guards/roles.guard';
import {
  ModerationQueueQueryDto,
  ModerationDecisionDto,
  BulkApproveDto,
  AuditLogQueryDto,
} from './dto/moderation.dto';

@ApiTags('Admin / Moderation')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  private readonly logger = new Logger(ModerationController.name);

  constructor(
    private moderationService: ModerationService,
    private auditLogService: AuditLogService,
  ) {}

  @Get('queue')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.CONTENT_REVIEWER)
  @ApiOperation({
    summary: 'Get moderation queue',
    description:
      'Returns all items pending review including listings, UGC, talent portfolios, payouts, and KYC submissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Moderation queue retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getQueue(@Query() query: ModerationQueueQueryDto) {
    this.logger.log(
      `Fetching moderation queue: type=${query.type}, status=${query.status}`,
    );

    const result = await this.moderationService.getQueue(query);

    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        summary: result.summary,
      },
    };
  }

  @Post('moderation/decide')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.CONTENT_REVIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process moderation decision',
    description:
      'Approve, reject, pause, or archive an item in the moderation queue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Decision processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid decision' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async processDecision(
    @Body() decision: ModerationDecisionDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;

    this.logger.log(
      `Processing moderation decision: ${decision.action} on ${decision.itemType}:${decision.itemId}`,
    );

    const result = await this.moderationService.processDecision(
      decision,
      user.id,
      user.role,
      req.ip,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('moderation/:itemType/:itemId/claim')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.CONTENT_REVIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim moderation item',
    description: 'Assign a listing, generated code submission, app submission, creator submission, or legal application to the current reviewer.',
  })
  @ApiParam({ name: 'itemType', enum: ['listing', 'generated_code', 'app_submission', 'talent_portfolio', 'ugc_submission', 'legal_application'] })
  @ApiParam({ name: 'itemId', type: String })
  @ApiResponse({ status: 200, description: 'Item claimed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid item type or transition' })
  @ApiResponse({ status: 404, description: 'Moderation item not found' })
  async claimItem(
    @Param('itemType') itemType: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;

    this.logger.log(`Claiming moderation item: ${itemType}:${itemId}`);

    const result = await this.moderationService.claimItem(
      itemType,
      itemId,
      user.id,
      user.role,
      req.ip,
    );

    return {
      success: result.success,
      message: result.message,
      data: result.item,
    };
  }

  @Post('moderation/bulk-approve')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.CONTENT_REVIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk approve items',
    description: 'Approve multiple items at once.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk approval processed',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async bulkApprove(@Body() dto: BulkApproveDto, @Req() req: Request) {
    const user = req.user as any;

    this.logger.log(
      `Bulk approving ${dto.itemIds.length} items of type ${dto.itemType}`,
    );

    const result = await this.moderationService.bulkApprove(
      dto.itemIds,
      dto.itemType,
      user.id,
      user.role,
    );

    return {
      success: true,
      data: {
        approved: result.success,
        failed: result.failed,
      },
    };
  }

  @Get('moderation/stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.ANALYST, AdminRole.CONTENT_REVIEWER)
  @ApiOperation({
    summary: 'Get moderation statistics',
    description: 'Returns statistics about moderation activity.',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getStats(@Query('days') days: number = 7) {
    const stats = await this.moderationService.getModerationStats(days);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('audit-logs')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Query the immutable audit log of all admin actions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - SuperAdmin only' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    this.logger.log('Fetching audit logs');

    const result = await this.auditLogService.query({
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return {
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }

  @Get('audit-logs/actor/:actorId')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get audit logs by actor',
    description: 'Get all audit logs for a specific admin user.',
  })
  @ApiParam({ name: 'actorId', type: String })
  async getAuditLogsByActor(
    @Param('actorId') actorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const data = await this.auditLogService.getByActor(actorId, page, limit);

    return {
      success: true,
      data,
    };
  }

  @Get('audit-logs/resource/:resourceType/:resourceId')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get audit logs by resource',
    description: 'Get all audit logs for a specific resource.',
  })
  @ApiParam({ name: 'resourceType', type: String })
  @ApiParam({ name: 'resourceId', type: String })
  async getAuditLogsByResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const data = await this.auditLogService.getByResource(
      resourceType,
      resourceId,
      page,
      limit,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('audit-logs/recent')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR, AdminRole.CONTENT_REVIEWER)
  @ApiOperation({
    summary: 'Get recent audit actions',
    description: 'Get all admin actions in the last N hours.',
  })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getRecentActions(@Query('hours') hours: number = 24) {
    const data = await this.auditLogService.getRecentActions(hours);

    return {
      success: true,
      data,
    };
  }

  @Get('audit-logs/summary')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ANALYST, AdminRole.FINANCE, AdminRole.FINANCE_OPERATOR)
  @ApiOperation({
    summary: 'Get action summary',
    description: 'Get a summary of actions grouped by type.',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getActionSummary(@Query('days') days: number = 7) {
    const summary = await this.auditLogService.getActionSummary(days);

    return {
      success: true,
      data: summary,
    };
  }
}
