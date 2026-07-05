import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGetAuth, apiPost } from '../lib/apiClient';

export interface ApiListMeta {
  page: number;
  limit: number;
  total: number;
  summary?: Record<string, number>;
}

interface ApiListResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiListMeta;
}

export interface AdminUser {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  status?: string;
  created_at?: string;
}

export interface AdminNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export type SupportedNotificationTarget = 'all' | 'specific' | 'role';

export interface SendAdminNotificationPayload {
  targetType: SupportedNotificationTarget;
  userId?: string;
  role?: string;
  type: string;
  title: string;
  message: string;
  showPopup?: boolean;
}

export interface AuditLogRecord {
  id: string;
  actor_id?: string | null;
  actorId?: string | null;
  actor_email?: string | null;
  actorEmail?: string | null;
  actor_role?: string | null;
  actorRole?: string | null;
  action?: string | null;
  resource_type?: string | null;
  resourceType?: string | null;
  resource_id?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  ipAddress?: string | null;
  user_agent?: string | null;
  userAgent?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const useAdminReviewQueue = <T,>({
  type,
  status,
  page = 1,
  limit = 50,
}: {
  type: string;
  status: string;
  page?: number;
  limit?: number;
}) => {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<ApiListMeta | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = buildQueryString({ type, status, page, limit });
      const result = await apiGetAuth<ApiListResponse<T[]>>(`/admin/queue${query}`);
      setItems(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta);
    } catch (err) {
      setItems([]);
      setMeta(undefined);
      setError(err instanceof Error ? err.message : 'Failed to load review queue.');
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, status, type]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, meta, isLoading, error, refetch: load };
};

export const useAdminNotifications = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [meta, setMeta] = useState<ApiListMeta | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, notificationsRes] = await Promise.all([
        apiGetAuth<ApiListResponse<AdminUser[]>>('/admin/notifications/users?limit=500'),
        apiGetAuth<ApiListResponse<AdminNotification[]>>('/admin/notifications?limit=100'),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data : []);
      setMeta(notificationsRes.meta);
    } catch (err) {
      setUsers([]);
      setNotifications([]);
      setMeta(undefined);
      setError(err instanceof Error ? err.message : 'Failed to load admin notification data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const postNotification = useCallback(async (payload: SendAdminNotificationPayload) => {
    return apiPost<ApiListResponse<{ recipientCount: number; notificationIds?: string[] }>>(
      '/admin/notifications',
      payload,
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendNotification = useCallback(async (payload: SendAdminNotificationPayload) => {
    const response = await postNotification(payload);
    await load();
    return response.data;
  }, [load, postNotification]);

  const deleteNotification = useCallback(async (id: string) => {
    await apiDelete<ApiListResponse<{ id: string }>>(`/admin/notifications/${id}`);
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  return {
    users,
    notifications,
    meta,
    isLoading,
    error,
    setError,
    refetch: load,
    sendNotification,
    deleteNotification,
  };
};

export const useAdminAuditLog = (filters: AuditLogFilters) => {
  const [events, setEvents] = useState<AuditLogRecord[]>([]);
  const [meta, setMeta] = useState<ApiListMeta | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stableFilters = useMemo(() => filters, [
    filters.action,
    filters.actorId,
    filters.endDate,
    filters.limit,
    filters.page,
    filters.resourceId,
    filters.resourceType,
    filters.severity,
    filters.startDate,
  ]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = buildQueryString({
        actorId: stableFilters.actorId,
        action: stableFilters.action,
        resourceType: stableFilters.resourceType,
        resourceId: stableFilters.resourceId,
        startDate: stableFilters.startDate,
        endDate: stableFilters.endDate,
        page: stableFilters.page || 1,
        limit: stableFilters.limit || 25,
      });
      const result = await apiGetAuth<ApiListResponse<AuditLogRecord[]>>(`/admin/audit-logs${query}`);
      setEvents(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta);
    } catch (err) {
      setEvents([]);
      setMeta(undefined);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  }, [stableFilters]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, meta, isLoading, error, refetch: load };
};
