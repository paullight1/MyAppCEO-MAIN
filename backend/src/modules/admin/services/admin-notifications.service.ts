import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';
import { AuditLogService } from './audit-log.service';
import { SendAdminNotificationDto } from '../dto/admin-notifications.dto';

type MarketingNotificationPreference = 'have' | 'want' | 'skip';

interface NotificationPreferences {
  emailOffers: boolean;
  pushOffers: boolean;
  marketingNotificationPreference?: MarketingNotificationPreference;
}

interface RecipientPreferenceRow {
  id: string;
  notification_preferences?: unknown;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailOffers: true,
  pushOffers: true,
};

interface AdminActor {
  id: string;
  email?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AdminNotificationsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
    private auditLogService: AuditLogService,
  ) {}

  async listUsers(limit = 500, search?: string) {
    let query = this.supabase
      .from('users')
      .select('id, email, full_name, role, created_at');

    if (search?.trim()) {
      const term = search.trim().replace(/[%_]/g, '\\$&');
      query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new InternalServerErrorException('Failed to list users');
    }

    return data || [];
  }

  async listNotifications(page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    const { data, error, count } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new InternalServerErrorException('Failed to list notifications');
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  }

  async sendNotification(dto: SendAdminNotificationDto, actor: AdminActor) {
    const title = dto.title.trim();
    const message = dto.message.trim();

    if (!title || !message) {
      throw new BadRequestException('Title and message are required');
    }

    let recipients = await this.getRecipients(dto);
    if (recipients.length === 0) {
      throw new BadRequestException('No users match the selected target');
    }

    if (this.isMarketingNotificationType(dto.type)) {
      recipients = await this.filterMarketingRecipients(recipients, dto.type);

      if (recipients.length === 0) {
        throw new BadRequestException('All selected users opted out of marketing notifications');
      }
    }

    const now = new Date().toISOString();
    const notifications = recipients.map((user) => ({
      user_id: user.id,
      type: dto.type,
      title,
      message,
      data: { show_popup: Boolean(dto.showPopup) },
      read: false,
      created_at: now,
    }));

    const { data, error } = await this.supabase
      .from('notifications')
      .insert(notifications)
      .select('id');

    if (error) {
      throw new InternalServerErrorException('Failed to send notifications');
    }

    const notificationIds = (data || []).map((item) => item.id);
    await this.auditLogService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role || 'admin',
      action: 'ADMIN_NOTIFICATION_SENT',
      resourceType: 'system',
      metadata: {
        targetType: dto.targetType,
        role: dto.role,
        userId: dto.userId,
        notificationType: dto.type,
        recipientCount: recipients.length,
        notificationIds,
      },
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      recipientCount: recipients.length,
      notificationIds,
    };
  }

  async deleteNotification(id: string, actor: AdminActor) {
    const { data, error } = await this.supabase
      .from('notifications')
      .delete()
      .select('id')
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException('Failed to delete notification');
    }
    if (!data?.length) {
      throw new NotFoundException('Notification not found');
    }

    await this.auditLogService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role || 'admin',
      action: 'ADMIN_NOTIFICATION_DELETED',
      resourceType: 'system',
      resourceId: id,
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async markNotification(id: string, read: boolean, actor: AdminActor) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({
        read,
        read_at: read ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select('id, read, read_at')
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to update notification');
    }
    if (!data) {
      throw new NotFoundException('Notification not found');
    }

    await this.auditLogService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role || 'admin',
      action: read ? 'ADMIN_NOTIFICATION_MARKED_READ' : 'ADMIN_NOTIFICATION_MARKED_UNREAD',
      resourceType: 'system',
      resourceId: id,
      metadata: { read },
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
    });

    return data;
  }

  private isMarketingNotificationType(type: string) {
    return type === 'promotional' || type === 'offer';
  }

  private normalizeNotificationPreferences(value: unknown): NotificationPreferences {
    const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};

    return {
      emailOffers: typeof raw.emailOffers === 'boolean' ? raw.emailOffers : true,
      pushOffers: typeof raw.pushOffers === 'boolean' ? raw.pushOffers : true,
      marketingNotificationPreference:
        raw.marketingNotificationPreference === 'have'
        || raw.marketingNotificationPreference === 'want'
        || raw.marketingNotificationPreference === 'skip'
          ? raw.marketingNotificationPreference
          : undefined,
    };
  }

  private shouldIncludeNotification(
    notificationType: string,
    preferences: NotificationPreferences,
  ) {
    if (notificationType === 'offer') {
      return preferences.emailOffers || preferences.pushOffers;
    }

    if (notificationType === 'promotional') {
      return preferences.marketingNotificationPreference !== 'skip';
    }

    return true;
  }

  private async filterMarketingRecipients<T extends { id: string }>(
    recipients: T[],
    notificationType: string,
  ): Promise<T[]> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, notification_preferences')
      .in('id', recipients.map((recipient) => recipient.id));

    if (error) {
      throw new InternalServerErrorException('Failed to load recipient preferences');
    }

    const preferencesByUserId = new Map(
      ((data || []) as RecipientPreferenceRow[]).map((row) => [
        row.id,
        this.normalizeNotificationPreferences(row.notification_preferences),
      ]),
    );

    return recipients.filter((recipient) =>
      this.shouldIncludeNotification(
        notificationType,
        preferencesByUserId.get(recipient.id) ?? DEFAULT_NOTIFICATION_PREFERENCES,
      ),
    );
  }

  private async getRecipients(dto: SendAdminNotificationDto) {
    if (dto.targetType === 'specific') {
      if (!dto.userId) {
        throw new BadRequestException('userId is required for specific notifications');
      }

      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('id', dto.userId)
        .limit(1);

      if (error) {
        throw new InternalServerErrorException('Failed to load recipient');
      }

      return data || [];
    }

    let query = this.supabase
      .from('users')
      .select('id, email, full_name, role, created_at');

    if (dto.targetType === 'role') {
      if (!dto.role) {
        throw new BadRequestException('role is required for role notifications');
      }
      query = query.eq('role', dto.role);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      throw new InternalServerErrorException('Failed to load recipients');
    }

    return data || [];
  }
}
