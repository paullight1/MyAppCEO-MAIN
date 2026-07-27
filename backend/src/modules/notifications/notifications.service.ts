import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { SUPABASE_ADMIN } from '../supabase/supabase.module';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

export enum NotificationType {
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  LISTING_APPROVED = 'LISTING_APPROVED',
  LISTING_REJECTED = 'LISTING_REJECTED',
  GENERATED_REVIEW_APPROVED = 'GENERATED_REVIEW_APPROVED',
  GENERATED_REVIEW_REJECTED = 'GENERATED_REVIEW_REJECTED',
  GENERATED_REVIEW_CHANGES_REQUESTED = 'GENERATED_REVIEW_CHANGES_REQUESTED',
  LICENSE_APPLICATION_APPROVED = 'LICENSE_APPLICATION_APPROVED',
  LICENSE_APPLICATION_REJECTED = 'LICENSE_APPLICATION_REJECTED',
  NEW_MESSAGE = 'NEW_MESSAGE',
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  target_type?: 'single' | 'user' | 'all' | 'segment';
  user_id?: string;
  segment?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private supabaseUrl: string;
  private supabaseServiceKey: string;

  constructor(
    @Inject(SUPABASE_ADMIN) private supabase: SupabaseClient,
  ) {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  async notify(userId: string, type: NotificationType, title: string, message: string, data: any = {}) {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      this.logger.log(`Notification sent to ${userId}: ${type}`);
    } catch (err) {
      this.logger.error('Failed to create notification', err);
    }
  }

  async registerDeviceToken(
    userId: string,
    fcmToken: string,
    deviceType?: string,
    deviceName?: string,
    appVersion?: string,
  ) {
    try {
      const { data, error } = await this.supabase.rpc('register_device_token', {
        p_fcm_token: fcmToken,
        p_device_type: deviceType || 'web',
        p_device_name: deviceName,
        p_app_version: appVersion,
      });

      if (error) throw error;
      return { success: true, token_id: data };
    } catch (err) {
      this.logger.error('Failed to register device token', err);
      throw err;
    }
  }

  async sendPushNotification(payload: PushNotificationPayload) {
    try {
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/send-push-notification`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseServiceKey}`,
        },
        body: JSON.stringify({
          action: 'send',
          title: payload.title,
          body: payload.body,
          data: payload.data,
          user_id: payload.user_id,
          target_type: payload.target_type || 'single',
          segment: payload.segment,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new InternalServerErrorException(result.error || 'Failed to send push notification');
      }

      this.logger.log(`Push notification sent: ${payload.title}`);
      return result;
    } catch (err) {
      this.logger.error('Failed to send push notification', err);
      throw err;
    }
  }

  async broadcastPushNotification(title: string, body: string, data?: Record<string, unknown>) {
    return this.sendPushNotification({
      title,
      body,
      data,
      target_type: 'all',
    });
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    const notifPayload = { user_id: userId, title, body, data };
    
    const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/send-push-notification`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseServiceKey}`,
      },
      body: JSON.stringify({
        action: 'send',
        ...notifPayload,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new InternalServerErrorException(result.error || 'Failed to send push notification');
    }

    return result;
  }

  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    const { data, error } = await this.supabase
      .from('push_notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  async getUnreadCount(userId: string) {
    const { count, error } = await this.supabase
      .from('push_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count;
  }
}
