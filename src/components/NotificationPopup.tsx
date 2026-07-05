import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Megaphone, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
    normalizeNotificationPreferences,
    shouldIncludeNotification,
} from '../utils/notificationPreferences';

interface PopupNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    data: any;
    created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string; accentBg: string }> = {
    announcement: { icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', accentBg: 'bg-blue-500' },
    system: { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10', accentBg: 'bg-gray-500' },
    promotional: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', accentBg: 'bg-emerald-500' },
    alert: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', accentBg: 'bg-amber-500' },
    feature: { icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', accentBg: 'bg-purple-500' },
};

const getDismissedKey = (userId: string) => `dismissed_notifications_${userId}`;

const getDismissedIds = (userId: string): string[] => {
    try {
        const stored = localStorage.getItem(getDismissedKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const dismissNotification = (userId: string, id: string) => {
    const dismissed = getDismissedIds(userId);
    if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem(getDismissedKey(userId), JSON.stringify(dismissed));
    }
};

interface NotificationPopupProps {
    userId: string;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ userId }) => {
    const [popups, setPopups] = useState<PopupNotification[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchPopupNotifications = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        try {
            const dismissedIds = getDismissedIds(userId);

            const [preferencesResult, notificationsResult] = await Promise.all([
                supabase
                    .from('user_profiles')
                    .select('notification_preferences')
                    .eq('id', userId)
                    .maybeSingle(),
                supabase
                    .from('notifications')
                    .select('id, title, message, type, data, created_at')
                    .eq('user_id', userId)
                    .eq('read', false)
                    .order('created_at', { ascending: false })
                    .limit(5),
            ]);

            const nextPreferences = normalizeNotificationPreferences(preferencesResult.data?.notification_preferences);

            const { data, error } = notificationsResult;
            if (error) {
                if (error.code === '404' || error.message?.includes('404')) {
                    console.warn('Notifications table not found -- skipping popup');
                }
                setPopups([]);
            } else if (data) {
                const popupNotifs = data.filter(
                    n => n.data?.show_popup && !dismissedIds.includes(n.id) && shouldIncludeNotification(n.type, nextPreferences)
                );
                setPopups(popupNotifs);
            }
        } catch (err) {
            console.warn('Failed to fetch popup notifications:', err);
        }

        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchPopupNotifications();
    }, [fetchPopupNotifications]);

    const handleClose = async (id: string) => {
        dismissNotification(userId, id);

        try {
            await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', id);
        } catch (err) {
            console.warn('Failed to mark popup as read:', err);
        }

        setPopups(prev => {
            const next = prev.filter(n => n.id !== id);
            if (currentIndex >= next.length && next.length > 0) {
                setCurrentIndex(next.length - 1);
            }
            return next;
        });
    };

    const handleDismissAll = async () => {
        for (const popup of popups) {
            dismissNotification(userId, popup.id);
        }
        try {
            await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .in('id', popups.map(n => n.id));
        } catch (err) {
            console.warn('Failed to dismiss all popups:', err);
        }
        setPopups([]);
    };

    if (loading || popups.length === 0) return null;

    const current = popups[currentIndex];
    const config = TYPE_CONFIG[current.type] || TYPE_CONFIG.announcement;
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismissAll} />

            {/* Popup Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
                {/* Accent Bar */}
                <div className={`h-1 ${config.accentBg}`} />

                {/* Close Button */}
                <button
                    onClick={() => handleClose(current.id)}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
                    aria-label="Close notification"
                >
                    <X size={18} className="text-muted-foreground" />
                </button>

                {/* Content */}
                <div className="p-8 pt-6">
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={24} className={config.color} />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                            <h3 className="text-xl font-bold text-foreground leading-tight">
                                {current.title}
                            </h3>
                            <p className="text-muted-foreground mt-2 leading-relaxed text-sm">
                                {current.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 mt-4 uppercase tracking-wider">
                                {new Date(current.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-6 flex items-center justify-between">
                    {/* Pagination dots */}
                    {popups.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            {popups.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-accent w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                                    aria-label={`Go to notification ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-3 ml-auto">
                        {popups.length > 1 && currentIndex < popups.length - 1 && (
                            <button
                                onClick={() => setCurrentIndex(i => i + 1)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Next
                            </button>
                        )}
                        <button
                            onClick={() => handleClose(current.id)}
                            className="px-6 py-2.5 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all active:scale-[0.98]"
                        >
                            {popups.length > 1 ? 'Close' : 'Got it'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
