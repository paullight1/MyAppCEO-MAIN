import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    Bell,
    CheckCircle2,
    CreditCard,
    Database,
    ExternalLink,
    Key,
    Loader2,
    Megaphone,
    Monitor,
    Moon,
    Palette,
    Save,
    Shield,
    ShieldCheck,
    Smartphone,
    Sun,
    Upload,
    User,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button, Checkbox, ConfirmDialog, FormField, Select, Toggle } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePayments } from '../hooks/usePayments';
import { type ThemePreference, useTheme } from '../hooks/useTheme';
import { useUserStatus } from '../hooks/useUserStatus';
import { useNotifications } from '../hooks/useNotifications';
import {
    MARKETING_NOTIFICATION_OPTIONS,
    NotificationPreferences,
} from '../utils/notificationPreferences';
import { supabase } from '../lib/supabaseClient';
import { cn } from '../utils/cn';

type SettingsSection = 'profile' | 'notifications' | 'verification' | 'security' | 'api' | 'billing' | 'payments' | 'appearance';
type DensityPreference = 'comfortable' | 'compact';
type SettingsSectionSync = 'server' | 'local' | 'linked' | 'shared';
type NotificationToggleKey =
    | 'emailOffers'
    | 'emailUpdates'
    | 'emailReports'
    | 'pushOffers'
    | 'pushUpdates'
    | 'pushReports';

interface LocalAppearanceSettings {
    language: string;
    density: DensityPreference;
    reduceMotion: boolean;
}

const THEME_OPTIONS: Array<{ id: ThemePreference; label: string; icon: React.ElementType }> = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
];

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string; icon: React.ElementType; sync: SettingsSectionSync }> = [
    { id: 'profile', label: 'Profile', icon: User, sync: 'server' },
    { id: 'notifications', label: 'Notifications', icon: Bell, sync: 'server' },
    { id: 'verification', label: 'Verification', icon: ShieldCheck, sync: 'server' },
    { id: 'security', label: 'Security', icon: Shield, sync: 'server' },
    { id: 'api', label: 'API Keys', icon: Key, sync: 'linked' },
    { id: 'billing', label: 'Billing', icon: CreditCard, sync: 'linked' },
    { id: 'payments', label: 'Payments', icon: CreditCard, sync: 'server' },
    { id: 'appearance', label: 'Appearance', icon: Palette, sync: 'shared' },
];

const APPEARANCE_STORAGE_KEY = 'myappceo.appearance';

const DEFAULT_APPEARANCE: LocalAppearanceSettings = {
    language: 'English (US)',
    density: 'comfortable',
    reduceMotion: false,
};

const LANGUAGE_OPTIONS = [
    { value: 'English (US)', label: 'English (US)' },
    { value: 'English (UK)', label: 'English (UK)' },
    { value: 'French', label: 'French' },
    { value: 'Spanish', label: 'Spanish' },
];

const DENSITY_OPTIONS: Array<{ value: DensityPreference; label: string }> = [
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'compact', label: 'Compact' },
];

const readAppearanceStorage = () => {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    } catch {
        return null;
    }
};

const writeAppearanceStorage = (value: LocalAppearanceSettings) => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(value));
    } catch {
        // Keep the local state usable even if browser storage is unavailable.
    }
};

const NOTIFICATION_GROUPS: Array<{
    title: string;
    icon: React.ElementType;
    items: Array<{ key: NotificationToggleKey; label: string; desc: string }>;
}> = [
    {
        title: 'Email notifications',
        icon: Bell,
        items: [
            { key: 'emailOffers', label: 'New offers on your listings', desc: 'Get notified when someone makes an offer.' },
            { key: 'emailUpdates', label: 'Platform updates', desc: 'Product, security, and policy updates.' },
            { key: 'emailReports', label: 'Weekly reports', desc: 'Portfolio, campaign, and marketplace summaries.' },
        ],
    },
    {
        title: 'Push notifications',
        icon: Smartphone,
        items: [
            { key: 'pushOffers', label: 'New offers', desc: 'Instant alerts for offer activity.' },
            { key: 'pushUpdates', label: 'Transaction updates', desc: 'Payment, escrow, and transfer status changes.' },
            { key: 'pushReports', label: 'Milestone alerts', desc: 'Campaign and build milestone movement.' },
        ],
    },
];

const getInitialAppearance = (): LocalAppearanceSettings => {
    if (typeof window === 'undefined') return DEFAULT_APPEARANCE;

    try {
        const saved = readAppearanceStorage();
        if (!saved) return DEFAULT_APPEARANCE;

        const parsed = JSON.parse(saved) as Partial<LocalAppearanceSettings> & { theme?: unknown };
        return {
            language: typeof parsed.language === 'string' ? parsed.language : DEFAULT_APPEARANCE.language,
            density:
                parsed.density === 'comfortable' || parsed.density === 'compact'
                    ? parsed.density
                    : DEFAULT_APPEARANCE.density,
            reduceMotion: typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : DEFAULT_APPEARANCE.reduceMotion,
        };
    } catch {
        return DEFAULT_APPEARANCE;
    }
};

const isSettingsSection = (value: string | null): value is SettingsSection =>
    SETTINGS_SECTIONS.some((section) => section.id === value);

export const SettingsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile: userStatus, isVerified, accountStatus, refetch: refetchProfile } = useUserStatus();
    const { connectStripe, isLoading: stripeLoading } = usePayments();
    const { themePreference, setThemePreference } = useTheme();
    const { preferences, savePreferences, firebaseReady } = useNotifications();

    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
    const [localProfile, setLocalProfile] = useState({
        name: '',
        email: '',
        company: '',
        role: '',
        avatarUrl: '' as string,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [notifications, setNotifications] = useState<NotificationPreferences>(preferences);
    const [appearance, setAppearance] = useState<LocalAppearanceSettings>(getInitialAppearance);
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [savingSection, setSavingSection] = useState<SettingsSection | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [confirmEmailOpen, setConfirmEmailOpen] = useState(false);
    const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
    const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (searchParams.get('success') === 'true' || searchParams.get('reauth') === 'true') {
            refetchProfile();
            setActiveSection('payments');
            return;
        }

        const section = searchParams.get('section');
        if (isSettingsSection(section)) {
            setActiveSection(section);
        }
    }, [searchParams, refetchProfile]);

    // Re-initialize only the server-owned identity fields when the profile
    // changes. Using a functional update preserves the user's in-progress
    // timezone edit (a client-only field) instead of clobbering it.
    useEffect(() => {
        setLocalProfile((current) => ({
            ...current,
            name: userStatus?.fullName || '',
            email: userStatus?.email || user?.email || '',
            company: userStatus?.companyName || '',
            role: userStatus?.role || 'member',
            avatarUrl: userStatus?.avatarUrl || (user?.user_metadata?.avatar_url as string | undefined) || '',
        }));
    }, [userStatus, user?.email, user?.user_metadata?.avatar_url]);

    useEffect(() => {
        setNotifications(preferences);
    }, [preferences]);

    useEffect(() => {
        writeAppearanceStorage(appearance);

        const root = document.documentElement;
        root.dataset.density = appearance.density;
        root.dataset.motion = appearance.reduceMotion ? 'reduced' : 'standard';
    }, [appearance]);

    const syncLabel = useMemo(() => {
        const section = SETTINGS_SECTIONS.find((item) => item.id === activeSection);
        if (section?.sync === 'shared') return 'Shared app theme + local browser prefs';
        if (section?.sync === 'local') return 'Local-only preference';
        if (section?.sync === 'linked') return 'Managed in linked workspace';
        return 'Server-synced account setting';
    }, [activeSection]);

    useEffect(() => () => {
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    }, []);

    const showMessage = (type: 'success' | 'error', text: string) => {
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        setStatusMessage({ type, text });
        messageTimerRef.current = setTimeout(() => {
            setStatusMessage(null);
            messageTimerRef.current = null;
        }, 3500);
    };

    // Upload a new avatar to Supabase Storage and persist its public URL on the
    // profile. Reuses the existing `app-documents` bucket (avatars/<uid>/ prefix)
    // rather than assuming a dedicated bucket. Fails loudly + safely if storage
    // policy rejects the upload, instead of silently corrupting profile state.
    const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Allow re-selecting the same file later.
        event.target.value = '';
        if (!file) return;
        if (!user) {
            showMessage('error', 'Sign in again before updating your avatar.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            showMessage('error', 'Choose an image file for your avatar.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showMessage('error', 'Avatar images must be 2 MB or smaller.');
            return;
        }

        setUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop() || 'png';
            const path = `avatars/${user.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('app-documents')
                .upload(path, file, { upsert: true, contentType: file.type });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('app-documents').getPublicUrl(path);

            const { error: saveError } = await supabase.from('user_profiles').upsert({
                id: user.id,
                avatar_url: publicUrl,
                updated_at: new Date().toISOString(),
            });
            if (saveError) throw saveError;

            setLocalProfile((current) => ({ ...current, avatarUrl: publicUrl }));
            await refetchProfile();
            showMessage('success', 'Avatar updated.');
        } catch (err) {
            showMessage('error', err instanceof Error ? err.message : 'Unable to upload avatar. Storage may not be configured.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) {
            showMessage('error', 'Sign in again before updating profile settings.');
            return;
        }

        setSavingSection('profile');
        try {
            if (localProfile.email && localProfile.email !== user.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email: localProfile.email });
                if (emailError) throw emailError;
            }

            const { error } = await supabase.from('user_profiles').upsert({
                id: user.id,
                email: localProfile.email,
                full_name: localProfile.name,
                company_name: localProfile.company,
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;
            await refetchProfile();
            showMessage('success', 'Profile saved to your account.');
        } catch (err) {
            showMessage('error', err instanceof Error ? err.message : 'Unable to save profile.');
        } finally {
            setSavingSection(null);
            setConfirmEmailOpen(false);
        }
    };

    // An email change is a consequential account mutation (it changes the
    // sign-in identity), so confirm before saving. Other profile edits save
    // straight away.
    const handleSaveProfileClick = () => {
        if (localProfile.email && user && localProfile.email !== user.email) {
            setConfirmEmailOpen(true);
        } else {
            void handleSaveProfile();
        }
    };

    const handleSaveNotifications = async () => {
        setSavingSection('notifications');
        try {
            await savePreferences(notifications);
            showMessage('success', 'Notification preferences saved.');
        } catch (err) {
            showMessage('error', err instanceof Error ? err.message : 'Unable to save notification preferences.');
        } finally {
            setSavingSection(null);
        }
    };

    const passwordIsValid =
        passwordForm.newPassword.length >= 8 && passwordForm.newPassword === passwordForm.confirmPassword;

    // Validate before opening the confirm dialog so the user isn't asked to
    // confirm an obviously invalid change.
    const handleUpdatePasswordClick = () => {
        if (passwordForm.newPassword.length < 8) {
            showMessage('error', 'Password must be at least 8 characters.');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showMessage('error', 'Passwords do not match.');
            return;
        }

        setConfirmPasswordOpen(true);
    };

    const handleUpdatePassword = async () => {
        if (!passwordIsValid) {
            setConfirmPasswordOpen(false);
            return;
        }

        setSavingSection('security');
        try {
            const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
            if (error) throw error;
            setPasswordForm({ newPassword: '', confirmPassword: '' });
            showMessage('success', 'Password updated.');
        } catch (err) {
            showMessage('error', err instanceof Error ? err.message : 'Unable to update password.');
        } finally {
            setSavingSection(null);
            setConfirmPasswordOpen(false);
        }
    };

    const handleConnectStripe = async () => {
        const result = await connectStripe();
        if (result?.data?.url) {
            window.location.href = result.data.url;
        }
    };

    // KYC / identity verification state derived from useUserStatus. `isVerified`
    // is the strict flag (kycStatus === 'approved' AND Stripe onboarding done);
    // the pill also reflects the raw kyc_status field so pending/rejected states
    // are surfaced honestly.
    const kycStatusValue = (userStatus?.kycStatus ?? '').toLowerCase();
    const kycVerified = isVerified || kycStatusValue === 'approved' || kycStatusValue === 'verified';
    const kycPending =
        !kycVerified &&
        (kycStatusValue === 'pending' ||
            kycStatusValue === 'in_review' ||
            kycStatusValue === 'processing' ||
            accountStatus === 'pending_verification');
    const kycRejected = !kycVerified && (kycStatusValue === 'rejected' || kycStatusValue === 'failed');
    const kycPill = kycVerified
        ? {
              label: 'Verified',
              icon: ShieldCheck,
              className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              description: 'Your identity is verified. You have full access to payouts and higher-trust marketplace actions.',
          }
        : kycPending
            ? {
                  label: 'Pending review',
                  icon: Loader2,
                  className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  description: 'Your verification is being reviewed. Finish any remaining onboarding steps to speed this up.',
              }
            : kycRejected
                ? {
                      label: 'Rejected',
                      icon: AlertCircle,
                      className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                      description: 'Verification was not approved. Restart onboarding to submit updated details.',
                  }
                : {
                      label: 'Not verified',
                      icon: Shield,
                      className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
                      description: 'You have not started identity verification yet. Verification unlocks payouts and higher-trust actions.',
                  };
    const KycPillIcon = kycPill.icon;

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-12">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage account settings separately from shared theme and local browser preferences.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
                        {activeSection === 'appearance' ? <Monitor size={14} /> : <Database size={14} />}
                        {syncLabel}
                    </div>
                </header>

                {statusMessage && (
                    <div className={`rounded-2xl border p-4 text-sm font-semibold ${
                        statusMessage.type === 'success'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    }`}>
                        <div className="flex items-center gap-2">
                            {statusMessage.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                            {statusMessage.text}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-6 md:flex-row">
                    <aside className="w-full shrink-0 md:w-64">
                        <nav className="rounded-2xl border border-border bg-card p-3" aria-label="Settings sections">
                            {SETTINGS_SECTIONS.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => setActiveSection(section.id)}
                                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition ${
                                            isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icon size={18} />
                                            <span className="text-sm">{section.label}</span>
                                        </span>
                                        <span className={`h-2 w-2 rounded-full ${
                                            section.sync === 'local'
                                                ? 'bg-amber-500'
                                                : section.sync === 'linked'
                                                    ? 'bg-blue-500'
                                                    : section.sync === 'shared'
                                                        ? 'bg-sky-500'
                                                        : 'bg-emerald-500'
                                        }`} />
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <main className="min-w-0 flex-1">
                        {activeSection === 'profile' && (
                            <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader title="Profile information" description="Server-synced account identity used across protected workspaces." icon={User} />
                                <div className="mt-6 space-y-6">
                                    <div className="flex items-center gap-5">
                                        {localProfile.avatarUrl ? (
                                            <img
                                                src={localProfile.avatarUrl}
                                                alt="Your avatar"
                                                className="h-20 w-20 rounded-2xl object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-bold text-white">
                                                {(localProfile.name || localProfile.email || 'U').slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleAvatarSelect}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    disabled={uploadingAvatar}
                                                >
                                                    {uploadingAvatar ? (
                                                        <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                                                    ) : (
                                                        <><Upload size={15} /> {localProfile.avatarUrl ? 'Change avatar' : 'Upload avatar'}</>
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="mt-1.5 text-sm text-muted-foreground">JPG, PNG or GIF, up to 2 MB.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                        <TextField label="Full name" value={localProfile.name} onChange={(value) => setLocalProfile((current) => ({ ...current, name: value }))} />
                                        <TextField label="Email" type="email" value={localProfile.email} onChange={(value) => setLocalProfile((current) => ({ ...current, email: value }))} />
                                        <TextField label="Company" value={localProfile.company} onChange={(value) => setLocalProfile((current) => ({ ...current, company: value }))} />
                                        <TextField label="Timezone" value={localProfile.timezone} onChange={(value) => setLocalProfile((current) => ({ ...current, timezone: value }))} helper="Device-derived unless your profile service stores it later." />
                                        <TextField label="Role" value={localProfile.role} disabled onChange={() => undefined} helper="Role changes require an admin workflow." />
                                    </div>

                                    <SaveRow
                                        label="Save profile"
                                        loading={savingSection === 'profile'}
                                        onClick={handleSaveProfileClick}
                                    />
                                </div>
                            </section>
                        )}

                        {activeSection === 'notifications' && (
                            <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader title="Notification preferences" description="Synced through the notifications preference flow, with local fallback when the backend table is unavailable." icon={Bell} />
                                <div className="mt-6 space-y-8">
                                    {NOTIFICATION_GROUPS.map((group) => {
                                        const Icon = group.icon;
                                        return (
                                            <div key={group.title}>
                                                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                                                    <Icon size={16} className="text-muted-foreground" />
                                                    {group.title}
                                                </h3>
                                                <div className="space-y-3">
                                                    {group.items.map((item) => (
                                                        <div key={item.key} className="rounded-xl bg-muted p-4 transition hover:bg-muted/80">
                                                            <Checkbox
                                                                checked={notifications[item.key]}
                                                                onCheckedChange={(checked) => setNotifications((current) => ({ ...current, [item.key]: checked }))}
                                                                label={item.label}
                                                                description={item.desc}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-foreground">
                                        <div className="flex items-center gap-2">
                                            <Megaphone size={18} className="text-primary" />
                                            <p className="text-sm font-semibold">Marketing notifications</p>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Choose whether promotional and offer notifications should be surfaced in your in-app feed.
                                        </p>
                                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                                            {MARKETING_NOTIFICATION_OPTIONS.map((option) => {
                                                const selected = notifications.marketingNotificationPreference === option.id;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => setNotifications((current) => ({ ...current, marketingNotificationPreference: option.id }))}
                                                        className={cn(
                                                            'rounded-2xl border p-4 text-left transition active:scale-[0.98]',
                                                            selected
                                                                ? 'border-primary bg-card'
                                                                : 'border-border bg-card/60 hover:border-primary/40 hover:bg-card',
                                                        )}
                                                    >
                                                        <p className="text-sm font-semibold text-foreground">{option.label}</p>
                                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-3 w-3 rounded-full ${firebaseReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            <span className="text-sm text-muted-foreground">
                                                {firebaseReady ? 'Push notification provider ready' : 'Push notification provider not configured'}
                                            </span>
                                        </div>
                                        <SaveRow label="Save preferences" loading={savingSection === 'notifications'} onClick={handleSaveNotifications} compact />
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'verification' && (
                            <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader title="Identity verification" description="KYC status is required before payouts and higher-trust marketplace actions." icon={ShieldCheck} />
                                <div className="mt-6 space-y-6">
                                    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted p-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Current status</p>
                                            <span className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', kycPill.className)}>
                                                <KycPillIcon size={13} className={kycPending ? 'animate-spin' : undefined} />
                                                {kycPill.label}
                                            </span>
                                            <p className="mt-3 max-w-md text-sm text-muted-foreground">{kycPill.description}</p>
                                        </div>
                                        {!kycVerified && (
                                            <Button onClick={() => navigate('/verify')} className="shrink-0">
                                                {kycPending ? 'Continue verification' : 'Start verification'}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-blue-700 dark:text-blue-300">
                                        <p className="font-bold">How verification works</p>
                                        <p className="mt-1 text-sm">
                                            Submit your identity details for review on the verification page. Once our compliance team approves your submission, this status updates automatically. Payout accounts are set up separately in the Payments section.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'security' && (
                            <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader title="Security settings" description="Password changes go through Supabase Auth. MFA controls need provider-level wiring before launch." icon={Shield} />
                                <div className="mt-6 space-y-6">
                                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                                        <div className="flex items-start gap-4">
                                            <Shield className="mt-1 shrink-0 text-amber-600" size={24} />
                                            <div>
                                                <p className="font-bold text-amber-700 dark:text-amber-300">MFA status requires backend/provider confirmation</p>
                                                <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-200/80">Do not show a false enabled state until the auth provider returns enrolled factors.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="max-w-md space-y-4">
                                        <TextField
                                            label="New password"
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
                                        />
                                        <TextField
                                            label="Confirm password"
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
                                        />
                                        <SaveRow label="Update password" loading={savingSection === 'security'} onClick={handleUpdatePasswordClick} />
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'api' && (
                            <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader title="API keys" description="Developer keys are managed in the dedicated portal so scope, rotation, revocation, and usage stats stay in one place." icon={Key} />
                                <div className="mt-6 rounded-2xl bg-muted p-5">
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        Use the developer portal for display-once secrets and API usage state. Settings keeps this as a pointer instead of duplicating sensitive key controls.
                                    </p>
                                    <Link to="/developers" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground transition hover:opacity-90">
                                        Open developer portal <ExternalLink size={15} />
                                    </Link>
                                </div>
                            </section>
                        )}

                        {activeSection === 'billing' && (
                            <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader title="Billing and subscription" description="Billing portal integration is a linked-service dependency for production." icon={CreditCard} />
                                <div className="mt-6 space-y-5">
                                    <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
                                        <p className="text-sm opacity-70">Current plan</p>
                                        <p className="mt-1 text-2xl font-bold">Pro Plan</p>
                                        <p className="mt-2 text-sm opacity-70">Demo state until the billing provider returns subscription data.</p>
                                    </div>
                                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-blue-700 dark:text-blue-300">
                                        <p className="font-bold">Production gap</p>
                                        <p className="mt-1 text-sm">Connect Stripe Billing or the selected provider portal before release sign-off.</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'payments' && (
                            <section className="space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader title="Payout settings" description="Server-backed payout onboarding and account status." icon={CreditCard} />

                                {searchParams.get('success') === 'true' && (
                                    <StatusPanel type="success" title="Stripe connected successfully" body="Your payout account is now active once backend verification confirms the account." />
                                )}

                                {searchParams.get('reauth') === 'true' && (
                                    <StatusPanel type="warning" title="Onboarding expired" body="Restart payout onboarding to refresh the provider session." />
                                )}

                                {userStatus?.stripeOnboardingComplete ? (
                                    <div className="space-y-6">
                                        <StatusPanel type="success" title="Stripe Connect active" body="Your payout account is set up and ready to receive funds." />
                                        <div className="rounded-2xl border border-border bg-muted p-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Stripe account ID</p>
                                                    <p className="mt-1 font-mono text-sm text-foreground">{userStatus.stripeAccountId || 'Not available'}</p>
                                                </div>
                                                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                                                    Open dashboard <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-border bg-muted p-5">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Stripe Connect</p>
                                                <p className="mt-1 text-sm text-muted-foreground">Complete provider verification before receiving marketplace payouts.</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleConnectStripe}
                                            disabled={stripeLoading}
                                            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-sm font-bold text-white transition hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
                                        >
                                            {stripeLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                                            {stripeLoading ? 'Connecting...' : 'Connect with Stripe'}
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                        {activeSection === 'appearance' && (
                            <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                                <SectionHeader
                                    title="Appearance"
                                    description="Theme changes update the shared app shell. Language, density, and motion stay local to this browser."
                                    icon={Palette}
                                />
                                <div className="mt-6 space-y-8">
                                    <div>
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-bold text-foreground">Theme</h3>
                                            <p className="text-xs text-muted-foreground">Shared with the header toggle and the rest of the app.</p>
                                        </div>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                            {THEME_OPTIONS.map((option) => {
                                                const Icon = option.icon;
                                                const selected = themePreference === option.id;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => setThemePreference(option.id)}
                                                        className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
                                                            selected ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-muted'
                                                        }`}
                                                    >
                                                        <Icon size={17} /> {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid gap-5 md:grid-cols-2">
                                        <Select
                                            label="Language"
                                            value={appearance.language}
                                            onValueChange={(value) => setAppearance((current) => ({ ...current, language: value }))}
                                            options={LANGUAGE_OPTIONS}
                                            placeholder=""
                                        />
                                        <Select
                                            label="Density"
                                            value={appearance.density}
                                            onValueChange={(value) => setAppearance((current) => ({ ...current, density: value as DensityPreference }))}
                                            options={DENSITY_OPTIONS}
                                            placeholder=""
                                        />
                                    </div>

                                    <div className="rounded-xl bg-muted p-4">
                                        <Toggle
                                            checked={appearance.reduceMotion}
                                            onCheckedChange={(checked) => setAppearance((current) => ({ ...current, reduceMotion: checked }))}
                                            label="Reduce motion"
                                            description="Stored locally as a browser preference. Not yet consumed by animations (data-motion is written but inert)."
                                        />
                                    </div>
                                </div>
                            </section>
                        )}
                    </main>
                </div>

                <ConfirmDialog
                    open={confirmEmailOpen}
                    onOpenChange={setConfirmEmailOpen}
                    title="Confirm email change"
                    description={`We'll update your sign-in email to ${localProfile.email}. You may need to confirm the change from your new inbox before it takes effect.`}
                    confirmLabel="Update email"
                    tone="primary"
                    loading={savingSection === 'profile'}
                    onConfirm={handleSaveProfile}
                />

                <ConfirmDialog
                    open={confirmPasswordOpen}
                    onOpenChange={setConfirmPasswordOpen}
                    title="Confirm password change"
                    description="This updates your account password immediately. You'll stay signed in on this device."
                    confirmLabel="Update password"
                    tone="primary"
                    loading={savingSection === 'security'}
                    confirmDisabled={!passwordIsValid}
                    onConfirm={handleUpdatePassword}
                />
            </div>
        </DashboardLayout>
    );
};

const SectionHeader: React.FC<{ title: string; description: string; icon: React.ElementType }> = ({ title, description, icon: Icon }) => (
    <div className="flex items-start gap-3 border-b border-border pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon size={19} />
        </div>
        <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
    </div>
);

const TextField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    disabled?: boolean;
    helper?: string;
}> = ({ label, value, onChange, type = 'text', disabled = false, helper }) => (
    <FormField label={label} helperText={helper} disabled={disabled}>
        {({ id, 'aria-describedby': describedBy, 'aria-invalid': invalid }) => (
            <input
                id={id}
                type={type}
                value={value}
                disabled={disabled}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                onChange={(event) => onChange(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-muted px-4 text-sm font-semibold text-foreground outline-none transition focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
        )}
    </FormField>
);

const SaveRow: React.FC<{ label: string; loading: boolean; onClick: () => void; compact?: boolean }> = ({ label, loading, onClick, compact = false }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50 ${compact ? '' : 'mt-2'}`}
    >
        {loading ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
        {label}
    </button>
);

const StatusPanel: React.FC<{ type: 'success' | 'warning'; title: string; body: string }> = ({ type, title, body }) => (
    <div className={`rounded-2xl border p-5 ${
        type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    }`}>
        <div className="flex items-start gap-3">
            {type === 'success' ? <CheckCircle2 size={22} className="mt-0.5 shrink-0" /> : <AlertCircle size={22} className="mt-0.5 shrink-0" />}
            <div>
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-sm leading-6 opacity-85">{body}</p>
            </div>
        </div>
    </div>
);
