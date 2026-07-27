import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Inject,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';
import { DRIZZLE } from '../../database/database.module';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  MarketplaceSyncDto,
  SyncResponseDto,
  SyncActionType,
} from './dto/sync.dto';
import { AuditLogService, AuditAction } from './services/audit-log.service';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { AdminRole } from './guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('Admin / Marketplace Sync')
@ApiBearerAuth()
@Controller('admin/marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
export class AdminSyncController {
  private readonly logger = new Logger(AdminSyncController.name);

  constructor(
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
    @Inject(DRIZZLE) private db: any,
    private auditLogService: AuditLogService,
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Synchronize signals from CEO Dashboard',
    description:
      'Process signals from Marketplace CEO Dashboard including improvement suggestions, price change alerts, growth alerts, and optimization requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync processed successfully',
    type: SyncResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid sync payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleMarketplaceSync(
    @Body() dto: MarketplaceSyncDto,
    @Req() req: Request,
  ): Promise<SyncResponseDto> {
    const processedAt = new Date().toISOString();
    this.logger.log(
      `Processing sync: ${dto.actionType} for app ${dto.appId}`,
    );

    if (dto.idempotencyKey) {
      const { data: existing } = await this.supabase
        .from('sync_events')
        .select('id')
        .eq('idempotency_key', dto.idempotencyKey)
        .single();

      if (existing) {
        this.logger.log(`Duplicate sync detected: ${dto.idempotencyKey}`);
        return {
          success: true,
          received: true,
          message: 'Duplicate event ignored',
          processedAt,
        };
      }
    }

    await this.processAction(dto, req);

    await this.createAuditLog(dto, req);

    await this.createNotification(dto);

    if (dto.idempotencyKey) {
      await this.supabase.from('sync_events').insert({
        idempotency_key: dto.idempotencyKey,
        action_type: dto.actionType,
        app_id: dto.appId,
        processed_at: processedAt,
      });
    }

    return {
      success: true,
      received: true,
      message: `${dto.actionType} processed successfully`,
      processedAt,
    };
  }

  private async processAction(dto: MarketplaceSyncDto, req: Request): Promise<void> {
    switch (dto.actionType) {
      case SyncActionType.GROWTH_ALERT:
        await this.handleGrowthAlert(dto);
        break;

      case SyncActionType.PRICE_CHANGE:
        await this.handlePriceChange(dto);
        break;

      case SyncActionType.OPTIMIZATION_REQUEST:
        await this.handleOptimizationRequest(dto);
        break;

      case SyncActionType.IMPROVEMENT_SUGGESTION:
        await this.handleImprovementSuggestion(dto);
        break;

      case SyncActionType.MARKETING_BUDGET_UPDATE:
        await this.handleMarketingBudgetUpdate(dto);
        break;

      case SyncActionType.REVENUE_MILESTONE:
        await this.handleRevenueMilestone(dto);
        break;

      case SyncActionType.USER_THRESHOLD_ALERT:
        await this.handleUserThresholdAlert(dto);
        break;

      case SyncActionType.BUG_REPORT:
        await this.handleBugReport(dto);
        break;

      case SyncActionType.FEATURE_REQUEST:
        await this.handleFeatureRequest(dto);
        break;

      default:
        this.logger.warn(`Unknown action type: ${dto.actionType}`);
    }
  }

  private async handleGrowthAlert(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;
    
    await this.supabase.from('growth_alerts').insert({
      app_id: dto.appId,
      current_growth: metadata.currentGrowth,
      target_growth: metadata.targetGrowth,
      timeframe: metadata.timeframe,
      suggested_actions: metadata.suggestedActions || [],
      status: 'pending_review',
      created_at: new Date().toISOString(),
    });

    this.logger.log(
      `Growth alert created for app ${dto.appId}: ${metadata.currentGrowth}% vs ${metadata.targetGrowth}%`,
    );
  }

  private async handlePriceChange(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    const { data: listing } = await this.supabase
      .from('listings')
      .select('id, asking_price')
      .eq('app_id', dto.appId)
      .single();

    if (listing) {
      await this.supabase.from('price_change_requests').insert({
        listing_id: listing.id,
        app_id: dto.appId,
        current_price: metadata.currentPrice,
        suggested_price: metadata.suggestedPrice,
        reason: metadata.reason,
        market_data: metadata.marketData || {},
        status: 'pending_approval',
        created_at: new Date().toISOString(),
      });

      this.logger.log(
        `Price change request created for listing ${listing.id}: ${metadata.currentPrice} -> ${metadata.suggestedPrice}`,
      );
    }
  }

  private async handleOptimizationRequest(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    await this.supabase.from('optimization_requests').insert({
      app_id: dto.appId,
      area: metadata.area,
      priority: metadata.priority,
      description: metadata.description,
      metrics: metadata.metrics || {},
      status: 'open',
      created_at: new Date().toISOString(),
    });

    this.logger.log(
      `Optimization request created for app ${dto.appId}: ${metadata.area}`,
    );
  }

  private async handleImprovementSuggestion(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    await this.supabase.from('improvement_suggestions').insert({
      app_id: dto.appId,
      category: metadata.category,
      suggestion: metadata.suggestion,
      impact: metadata.impact,
      implementation_effort: metadata.implementationEffort,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    });

    this.logger.log(
      `Improvement suggestion created for app ${dto.appId}: ${metadata.category}`,
    );
  }

  private async handleMarketingBudgetUpdate(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    await this.supabase.from('marketing_budget_changes').insert({
      app_id: dto.appId,
      previous_budget: metadata.previousBudget,
      new_budget: metadata.newBudget,
      change_reason: metadata.reason,
      effective_date: metadata.effectiveDate,
      status: 'pending_approval',
      created_at: new Date().toISOString(),
    });
  }

  private async handleRevenueMilestone(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    await this.supabase.from('revenue_milestones').insert({
      app_id: dto.appId,
      milestone_type: metadata.milestoneType,
      value: metadata.value,
      achieved_at: metadata.achievedAt,
      previous_value: metadata.previousValue,
      celebration_sent: false,
      created_at: new Date().toISOString(),
    });

    this.logger.log(
      `Revenue milestone recorded for app ${dto.appId}: ${metadata.milestoneType} - ${metadata.value}`,
    );
  }

  private async handleUserThresholdAlert(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    await this.supabase.from('user_threshold_alerts').insert({
      app_id: dto.appId,
      threshold_type: metadata.thresholdType,
      current_users: metadata.currentUsers,
      threshold_value: metadata.thresholdValue,
      alert_level: metadata.alertLevel,
      created_at: new Date().toISOString(),
    });
  }

  private async handleBugReport(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    await this.supabase.from('bug_reports').insert({
      app_id: dto.appId,
      title: metadata.title,
      description: metadata.description,
      severity: metadata.severity,
      affected_users: metadata.affectedUsers || 0,
      status: 'open',
      reported_by: dto.userId,
      created_at: new Date().toISOString(),
    });

    this.logger.log(`Bug report created for app ${dto.appId}: ${metadata.title}`);
  }

  private async handleFeatureRequest(dto: MarketplaceSyncDto): Promise<void> {
    const metadata = dto.metadata as any;

    await this.supabase.from('feature_requests').insert({
      app_id: dto.appId,
      title: metadata.title,
      description: metadata.description,
      requested_by: dto.userId,
      priority: metadata.priority || 'medium',
      votes: 0,
      status: 'under_review',
      created_at: new Date().toISOString(),
    });

    this.logger.log(
      `Feature request created for app ${dto.appId}: ${metadata.title}`,
    );
  }

  private async createAuditLog(
    dto: MarketplaceSyncDto,
    req: Request,
  ): Promise<void> {
    await this.auditLogService.log({
      actorId: dto.userId || 'system',
      actorRole: dto.source === 'CEO_DASHBOARD' ? 'ceo' : 'system',
      action: AuditAction.MARKETPLACE_SYNC,
      resourceType: 'sync',
      resourceId: dto.appId,
      metadata: {
        actionType: dto.actionType,
        source: dto.source,
        metadata: dto.metadata,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  private async createNotification(dto: MarketplaceSyncDto): Promise<void> {
    const actionLabels: Record<SyncActionType, string> = {
      [SyncActionType.GROWTH_ALERT]: 'Growth Alert',
      [SyncActionType.PRICE_CHANGE]: 'Price Change Request',
      [SyncActionType.OPTIMIZATION_REQUEST]: 'Optimization Request',
      [SyncActionType.IMPROVEMENT_SUGGESTION]: 'Improvement Suggestion',
      [SyncActionType.MARKETING_BUDGET_UPDATE]: 'Marketing Budget Update',
      [SyncActionType.REVENUE_MILESTONE]: 'Revenue Milestone',
      [SyncActionType.USER_THRESHOLD_ALERT]: 'User Threshold Alert',
      [SyncActionType.BUG_REPORT]: 'Bug Report',
      [SyncActionType.FEATURE_REQUEST]: 'Feature Request',
    };

    const { data: admins } = await this.supabase
      .from('users')
      .select('id')
      .in('role', ['super_admin', 'moderator']);

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: 'MARKETPLACE_ALERT',
        title: actionLabels[dto.actionType],
        message: `App ${dto.appId} triggered: ${actionLabels[dto.actionType]}`,
        data: {
          appId: dto.appId,
          actionType: dto.actionType,
          metadata: dto.metadata,
        },
        read: false,
        created_at: new Date().toISOString(),
      }));

      await this.supabase.from('notifications').insert(notifications);
    }
  }

  @Get('sync/history')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Get sync event history' })
  async getSyncHistory(
    @Query('appId') appId?: string,
    @Query('actionType') actionType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('sync_events')
      .select('*', { count: 'exact' })
      .order('processed_at', { ascending: false });

    if (appId) {
      query = query.eq('app_id', appId);
    }
    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) {
      throw new InternalServerErrorException('Failed to fetch sync history');
    }

    return {
      success: true,
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
      },
    };
  }
}
