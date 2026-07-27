import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';
import { SupabaseClient } from '@supabase/supabase-js';

export enum AuditAction {
  LISTING_APPROVED = 'LISTING_APPROVED',
  LISTING_CLAIMED = 'LISTING_CLAIMED',
  LISTING_REJECTED = 'LISTING_REJECTED',
  LISTING_PAUSED = 'LISTING_PAUSED',
  LISTING_ARCHIVED = 'LISTING_ARCHIVED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_UNSUSPENDED = 'USER_UNSUSPENDED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  PAYOUT_APPROVED = 'PAYOUT_APPROVED',
  PAYOUT_REJECTED = 'PAYOUT_REJECTED',
  MARKETPLACE_SYNC = 'MARKETPLACE_SYNC',
  PRICE_CHANGE_PROCESSED = 'PRICE_CHANGE_PROCESSED',
  GROWTH_ALERT_PROCESSED = 'GROWTH_ALERT_PROCESSED',
  OPTIMIZATION_REQUESTED = 'OPTIMIZATION_REQUESTED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  CAMPAIGN_APPROVED = 'CAMPAIGN_APPROVED',
  CAMPAIGN_REJECTED = 'CAMPAIGN_REJECTED',
  GENERATED_CODE_APPROVED = 'GENERATED_CODE_APPROVED',
  REVIEW_SUBMISSION_CLAIMED = 'REVIEW_SUBMISSION_CLAIMED',
  GENERATED_CODE_REJECTED = 'GENERATED_CODE_REJECTED',
  GENERATED_CODE_CHANGES_REQUESTED = 'GENERATED_CODE_CHANGES_REQUESTED',
  LEGAL_APPLICATION_CLAIMED = 'LEGAL_APPLICATION_CLAIMED',
  LEGAL_APPLICATION_APPROVED = 'LEGAL_APPLICATION_APPROVED',
  LEGAL_APPLICATION_REJECTED = 'LEGAL_APPLICATION_REJECTED',
}

export interface AuditLogEntry {
  id?: string;
  actorId: string;
  actorEmail?: string;
  actorRole: string;
  action: AuditAction | string;
  resourceType: 'listing' | 'user' | 'app' | 'payout' | 'campaign' | 'sync' | 'system' | 'generated_code' | 'app_submission' | 'legal_application';
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
  ) {}

  async log(entry: AuditLogEntry): Promise<{ success: boolean; id?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('admin_audit_logs')
        .insert({
          actor_id: entry.actorId,
          actor_email: entry.actorEmail,
          actor_role: entry.actorRole,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          metadata: entry.metadata || {},
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          timestamp: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        this.logger.error('Failed to create audit log', error);
        return { success: false };
      }

      this.logger.log(
        `Audit log created: ${entry.action} by ${entry.actorId} on ${entry.resourceType}:${entry.resourceId}`,
      );

      return { success: true, id: data?.id };
    } catch (err) {
      this.logger.error('Exception creating audit log', err);
      return { success: false };
    }
  }

  async query(query: AuditLogQuery): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      actorId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
    } = query;

    const offset = (page - 1) * limit;

    let queryBuilder = this.supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact' });

    if (actorId) {
      queryBuilder = queryBuilder.eq('actor_id', actorId);
    }
    if (action) {
      queryBuilder = queryBuilder.eq('action', action);
    }
    if (resourceType) {
      queryBuilder = queryBuilder.eq('resource_type', resourceType);
    }
    if (resourceId) {
      queryBuilder = queryBuilder.eq('resource_id', resourceId);
    }
    if (startDate) {
      queryBuilder = queryBuilder.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('timestamp', endDate.toISOString());
    }

    const { data, error, count } = await queryBuilder
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to query audit logs', error);
      throw new InternalServerErrorException('Failed to query audit logs');
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  }

  async getByActor(
    actorId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('actor_id', actorId)
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      this.logger.error('Failed to get audit logs by actor', error);
      throw new InternalServerErrorException('Failed to get audit logs');
    }

    return data || [];
  }

  async getByResource(
    resourceType: string,
    resourceId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      this.logger.error('Failed to get audit logs by resource', error);
      throw new InternalServerErrorException('Failed to get audit logs');
    }

    return data || [];
  }

  async getRecentActions(hours: number = 24): Promise<any[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await this.supabase
      .from('admin_audit_logs')
      .select('*')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      this.logger.error('Failed to get recent audit logs', error);
      throw new InternalServerErrorException('Failed to get recent audit logs');
    }

    return data || [];
  }

  async getActionSummary(days: number = 7): Promise<Record<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.supabase
      .from('admin_audit_logs')
      .select('action')
      .gte('timestamp', since.toISOString());

    if (error) {
      this.logger.error('Failed to get action summary', error);
      throw new InternalServerErrorException('Failed to get action summary');
    }

    const summary: Record<string, number> = {};
    (data || []).forEach((item) => {
      summary[item.action] = (summary[item.action] || 0) + 1;
    });

    return summary;
  }
}
