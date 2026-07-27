import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    Send,
    Users,
    User,
    Megaphone,
    Bell,
    AlertTriangle,
    TrendingUp,
    CheckCircle2,
    Loader2,
    Clock,
    Trash2,
    Search,
    Filter
} from 'lucide-react';
import { useAdminNotifications, type AdminNotification } from '../hooks/useAdminOperations';
import { getAdminNotificationCandidates, type AdminNotificationTargetSelection } from '../utils/adminNotificationRecipients';
import { ConfirmDialog } from '../components/ui';
import { formatDate } from '../utils/format';

const NOTIFICATION_TYPES = [
    { id: 'announcement', label: 'Announcement', icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { id: 'system', label: 'System Update', icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10' },
    { id: 'promotional', label: 'Promotional', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'alert', label: 'Alert', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { id: 'feature', label: 'New Feature', icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
];

export const AdminNotificationPage: React.FC = () => {
    const {
        users,
        notifications: sentNotifications,
        isLoading,
        error: loadError,
        setError: setLoadError,
        refetch,
        sendNotification,
        deleteNotification,
    } = useAdminNotifications();
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const [targetType, setTargetType] = useState<AdminNotificationTargetSelection['targetType']>('all');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState('ceo');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [notifType, setNotifType] = useState('announcement');
    const [showAsPopup, setShowAsPopup] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [notifToDelete, setNotifToDelete] = useState<AdminNotification | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            setError('Title and message are required.');
            return;
        }
        if (targetType === 'status' || targetType === 'segment') {
            setError('Status and segment targeting are visible for planning, but the current admin API only supports all users, role, and specific user sends.');
            return;
        }

        setSending(true);
        setError('');
        setSuccess('');

        if (recipientCount === 0) {
            setError('No users match the selected target.');
            setSending(false);
            return;
        }

        try {
            const response = await sendNotification({
                targetType,
                userId: targetType === 'specific' ? selectedUserId : undefined,
                role: targetType === 'role' ? selectedRole : undefined,
                type: notifType,
                title: title.trim(),
                message: message.trim(),
                showPopup: showAsPopup,
            });
            const sentCount = response.recipientCount;
            setSuccess(
                notifType === 'promotional'
                    ? `Promotional notification sent to ${sentCount} eligible user${sentCount > 1 ? 's' : ''}.`
                    : `Notification sent to ${sentCount} user${sentCount > 1 ? 's' : ''}.`
            );
            setTitle('');
            setMessage('');
            setShowAsPopup(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send notification.');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async () => {
        if (!notifToDelete) return;
        setDeleting(true);
        setError('');
        try {
            await deleteNotification(notifToDelete.id);
            setNotifToDelete(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete notification.');
        } finally {
            setDeleting(false);
        }
    };

    const availableRoles = useMemo(() => {
        const roles = [...new Set(users.map((user) => user.role).filter(Boolean))] as string[];
        return roles.length ? roles : ['ceo', 'creator', 'admin'];
    }, [users]);

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const recipientCount = useMemo(() => {
        return getAdminNotificationCandidates(users, {
            targetType,
            selectedUserId,
            selectedRole,
        }).length;
    }, [selectedRole, selectedUserId, targetType, users]);

    const displayError = error || loadError;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                                <Bell size={20} className="text-white" />
                            </span>
                            Admin Notifications
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1">Send notifications to users or broadcast to all</p>
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        aria-label={showHistory ? 'Switch to notification composer' : 'View sent notification history'}
                        className="px-5 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
                    >
                        <Clock size={18} />
                        {showHistory ? 'Compose' : 'View History'}
                    </button>
                </div>

                {success && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                        <p className="text-emerald-500 text-sm font-medium">{success}</p>
                    </div>
                )}

                {displayError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                        <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                        <p className="text-red-500 text-sm font-medium">{displayError}</p>
                        {loadError && (
                            <button
                                onClick={() => {
                                    setLoadError(null);
                                    refetch();
                                }}
                                className="ml-auto text-xs font-bold text-red-500 hover:text-red-600"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                )}

                {!showHistory ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Compose Panel */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card rounded-2xl border border-border p-8">
                                <h2 className="text-lg font-bold text-foreground mb-6">Compose Notification</h2>

                                {/* Target */}
                                <div className="space-y-4 mb-6">
                                    <label className="text-sm font-bold text-foreground">Target Audience</label>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { id: 'all' as const, label: 'All Users', icon: Users, count: users.length },
                                            { id: 'specific' as const, label: 'Specific User', icon: User, count: 1 },
                                            { id: 'role' as const, label: 'By Role', icon: Filter, count: users.filter(u => u.role === selectedRole).length },
                                            { id: 'status' as const, label: 'By Status', icon: Filter, comingSoon: true as const },
                                            { id: 'segment' as const, label: 'Segment', icon: Filter, comingSoon: true as const },
                                        ].map(opt => {
                                            const Icon = opt.icon;
                                            const comingSoon = 'comingSoon' in opt && opt.comingSoon;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => { if (!comingSoon) setTargetType(opt.id); }}
                                                    disabled={comingSoon}
                                                    aria-pressed={targetType === opt.id}
                                                    title={comingSoon ? 'Coming soon — the admin API does not support this target yet' : undefined}
                                                    className={`px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all flex items-center gap-2 ${comingSoon
                                                        ? 'border-dashed border-border text-muted-foreground/60 cursor-not-allowed'
                                                        : targetType === opt.id
                                                            ? 'border-accent bg-accent/10 text-accent'
                                                            : 'border-border text-muted-foreground hover:border-accent/50'
                                                        }`}
                                                >
                                                    <Icon size={16} />
                                                    {opt.label}
                                                    {comingSoon ? (
                                                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
                                                    ) : (
                                                        <span className="text-xs opacity-60">({'count' in opt ? opt.count : 0})</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {targetType === 'specific' && (
                                        <div className="mt-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    placeholder="Search by name or email..."
                                                    aria-label="Search users by name or email"
                                                    className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                                                />
                                            </div>
                                            <div className="mt-2 max-h-40 overflow-y-auto space-y-1 bg-muted rounded-xl border border-border">
                                                {filteredUsers.slice(0, 10).map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => { setSelectedUserId(u.id); setSearchQuery(''); }}
                                                        aria-pressed={selectedUserId === u.id}
                                                        className={`w-full px-4 py-2.5 text-left text-sm rounded-lg transition-colors flex items-center justify-between ${selectedUserId === u.id ? 'bg-accent/10 text-accent' : 'hover:bg-muted/80'}`}
                                                    >
                                                        <span>{u.full_name || u.email}</span>
                                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                                    </button>
                                                ))}
                                                {filteredUsers.length === 0 && (
                                                    <p className="px-4 py-3 text-sm text-muted-foreground">No users found</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {targetType === 'role' && (
                                        <div className="mt-2 flex gap-2">
                                            {availableRoles.map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => setSelectedRole(role)}
                                                    aria-pressed={selectedRole === role}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${selectedRole === role
                                                        ? 'bg-accent/10 text-accent border border-accent/30'
                                                        : 'bg-muted text-muted-foreground border border-border hover:border-accent/50'
                                                        }`}
                                                >
                                                    {role}s ({users.filter(u => u.role === role).length})
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Status and segment targeting are planned — the current admin API only sends to all users, a role, or a specific user.
                                    </p>
                                </div>

                                {/* Notification Type */}
                                <div className="space-y-4 mb-6">
                                    <label className="text-sm font-bold text-foreground">Notification Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {NOTIFICATION_TYPES.map(type => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setNotifType(type.id)}
                                                    aria-pressed={notifType === type.id}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${notifType === type.id
                                                        ? `${type.bg} ${type.color} border border-current/20`
                                                        : 'bg-muted text-muted-foreground border border-border hover:border-accent/50'
                                                        }`}
                                                >
                                                    <Icon size={16} />
                                                    {type.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {notifType === 'promotional' && (
                                        <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                            Promotional sends are filtered against each recipient&apos;s saved marketing notification settings.
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="space-y-2 mb-4">
                                    <label className="text-sm font-bold text-foreground">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g., New Feature Available"
                                        aria-label="Notification title"
                                        maxLength={255}
                                        className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                                    />
                                    <p className="text-xs text-muted-foreground text-right">{title.length}/255</p>
                                </div>

                                {/* Message */}
                                <div className="space-y-2 mb-6">
                                    <label className="text-sm font-bold text-foreground">Message</label>
                                    <textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder="Write your notification message..."
                                        aria-label="Notification message"
                                        rows={4}
                                        maxLength={1000}
                                        className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
                                </div>

                                {/* Show as popup toggle */}
                                <label className="flex items-center gap-3 p-4 bg-muted rounded-xl cursor-pointer mb-6">
                                    <input
                                        type="checkbox"
                                        checked={showAsPopup}
                                        onChange={e => setShowAsPopup(e.target.checked)}
                                        className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                                    />
                                    <div>
                                        <p className="font-semibold text-foreground">Show as in-app popup</p>
                                        <p className="text-sm text-muted-foreground">This notification will appear as a popup when users log in</p>
                                    </div>
                                </label>

                                {/* Send Button */}
                                <button
                                    onClick={handleSend}
                                    disabled={sending || isLoading || !title.trim() || !message.trim() || recipientCount === 0 || targetType === 'status' || targetType === 'segment'}
                                    className="w-full py-4 bg-accent text-accent-foreground rounded-xl font-bold text-sm hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Send to {recipientCount} User{recipientCount !== 1 ? 's' : ''}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="space-y-6">
                            <div className="bg-card rounded-2xl border border-border p-8 sticky top-24">
                                <h2 className="text-lg font-bold text-foreground mb-4">Preview</h2>
                                <div className="bg-muted rounded-xl p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                            {(() => {
                                                const type = NOTIFICATION_TYPES.find(t => t.id === notifType);
                                                const Icon = type?.icon || Bell;
                                                return <Icon size={16} className={type?.color || 'text-accent'} />;
                                            })()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-foreground text-sm truncate">
                                                {title || 'Notification Title'}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                {message || 'Your notification message will appear here...'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] text-muted-foreground">Just now</span>
                                                <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {showAsPopup && (
                                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                            <AlertTriangle size={14} />
                                            Popup Enabled
                                        </p>
                                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                                            Users will see this as a popup on their next login. They can dismiss it with the close button.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-xs text-muted-foreground">
                                        Recipients: <span className="font-bold text-foreground">{recipientCount}</span> user{recipientCount !== 1 ? 's' : ''}
                                    </p>
                                    {notifType === 'promotional' && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                            The final send count may be lower after server-side marketing opt-outs are applied.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Notification History */
                    <div className="bg-card rounded-2xl border border-border">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-lg font-bold text-foreground">Sent Notifications</h2>
                            <p className="text-sm text-muted-foreground mt-1">Recent notifications sent to users</p>
                        </div>
                        {isLoading ? (
                            <div className="p-10 text-center text-muted-foreground">
                                <Loader2 size={40} className="mx-auto mb-4 animate-spin opacity-70" />
                                <p>Loading sent notifications...</p>
                            </div>
                        ) : sentNotifications.length === 0 ? (
                            <div className="p-10 text-center text-muted-foreground">
                                <Bell size={40} className="mx-auto mb-4 opacity-30" />
                                <p>No notifications sent yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {sentNotifications.map(notif => {
                                    const type = NOTIFICATION_TYPES.find(t => t.id === notif.type);
                                    const Icon = type?.icon || Bell;
                                    return (
                                        <div key={notif.id} className="p-6 hover:bg-muted/30 transition-colors flex items-start gap-4">
                                            <div className={`w-10 h-10 rounded-xl ${type?.bg || 'bg-muted'} flex items-center justify-center flex-shrink-0`}>
                                                <Icon size={18} className={type?.color || 'text-muted-foreground'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-foreground text-sm truncate">{notif.title}</p>
                                                    {Boolean(notif.data?.show_popup) && (
                                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded-full uppercase">Popup</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[10px] text-muted-foreground">{formatDate(notif.created_at)}</span>
                                                    <span className="text-[10px] text-muted-foreground capitalize">{notif.type}</span>
                                                    {notif.read && <span className="text-[10px] text-emerald-500">Read</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => setNotifToDelete(notif)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete" aria-label={`Delete notification ${notif.title}`}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={Boolean(notifToDelete)}
                onOpenChange={(open) => { if (!open) setNotifToDelete(null); }}
                title="Delete notification?"
                description={notifToDelete ? `"${notifToDelete.title}" will be permanently removed. This cannot be undone.` : undefined}
                confirmLabel="Delete"
                tone="danger"
                loading={deleting}
                onConfirm={handleDelete}
            />
        </DashboardLayout>
    );
};
