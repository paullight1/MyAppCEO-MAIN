import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  normalizeNotificationPreferences,
  shouldIncludeNotification,
} from '../utils/notificationPreferences';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  archived_at?: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [firebaseReady] = useState(false);
  const { user } = useAuth();

  // Single source of truth for the badge — derived from the notifications array
  // so it can never drift out of sync with the actual read/archived state.
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // Latest preferences, readable synchronously inside long-lived realtime
  // handlers without re-subscribing the channel on every preference change.
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('notification_preferences')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled || error) return;

        const nextPrefs = normalizeNotificationPreferences(data?.notification_preferences);
        setPreferences(nextPrefs);
        localStorage.setItem('notification_preferences', JSON.stringify(nextPrefs));
      } catch (err) {
        console.warn('Failed to load notification preferences:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      let { data, error } = await query;

      if (error?.message?.includes('archived_at')) {
        const retry = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const visibleNotifications = data.filter((notification) =>
          shouldIncludeNotification(notification.type, preferences),
        );
        setNotifications(visibleNotifications);
      } else if (error) {
        console.warn('Notifications table not available:', error.message);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
    setIsLoading(false);
  }, [preferences, user]);

  // Initial load + re-filter whenever preferences change. Kept separate from the
  // realtime subscription so a preference change refetches without tearing down
  // and recreating the channel.
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe exactly once per user. Handlers read the latest preferences from a
  // ref, so preference changes never churn the channel or leave stale closures.
  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const isArchived = (n: Pick<Notification, 'archived_at'>) => n.archived_at != null;

    try {
      const channel = supabase
        .channel(`user-notifications-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            const newNotification = payload.new as Notification;
            if (isArchived(newNotification)) return;
            if (!shouldIncludeNotification(newNotification.type, preferencesRef.current)) return;

            setNotifications((prev) =>
              prev.some((n) => n.id === newNotification.id) ? prev : [newNotification, ...prev],
            );

            if ('Notification' in window && Notification.permission === 'granted') {
              new window.Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/logo.png',
              });
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            const updated = payload.new as Notification;
            // Archived (or filtered out by prefs) elsewhere -> drop it locally.
            if (isArchived(updated) || !shouldIncludeNotification(updated.type, preferencesRef.current)) {
              setNotifications((prev) => prev.filter((n) => n.id !== updated.id));
              return;
            }
            setNotifications((prev) => {
              if (!prev.some((n) => n.id === updated.id)) return prev;
              return prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n));
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            const deletedId = (payload.old as Partial<Notification>).id;
            if (!deletedId) return;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Notifications realtime channel error -- table may not exist');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Failed to subscribe to notifications:', err);
    }
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (!error) {
        // Idempotent: only flips read=true; the derived count updates itself.
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ archived_at: new Date().toISOString(), read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (!error) {
        // Just remove from the array — the derived count stays correct whether
        // or not the archived item was already read.
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.warn('Failed to archive notification:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  };

  const loadPreferences = () => {
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      try {
        setPreferences(normalizeNotificationPreferences(JSON.parse(saved)));
      } catch {
        console.error('Failed to parse notification preferences');
      }
    }
  };

  const savePreferences = useCallback(async (newPrefs: NotificationPreferences) => {
    const normalizedPrefs = normalizeNotificationPreferences(newPrefs);
    setPreferences(normalizedPrefs);
    localStorage.setItem('notification_preferences', JSON.stringify(normalizedPrefs));

    if (user) {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ id: user.id, notification_preferences: normalizedPrefs }, { onConflict: 'id' });

      if (error) {
        throw error;
      }
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    preferences,
    firebaseReady,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    savePreferences,
    refresh: fetchNotifications,
  };
};
