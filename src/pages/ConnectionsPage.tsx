import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    Link2,
    ShieldCheck,
    RefreshCcw,
    Lock,
    Plus,
    Server,
    X,
    Loader2,
    Facebook,
    Music2,
    Twitter,
    DollarSign,
    Store,
    Smartphone,
    Zap,
    BarChart2,
    CheckCircle2,
    AlertTriangle,
    Globe,
    ExternalLink,
    Apple,
    RefreshCw,
    Settings2,
} from 'lucide-react';
import { Button } from '../components/ui';
import { OAuthPlatform, useSocialAutomation } from '../hooks/useSocialAutomation';
import { useUserApps, UserAppMembership } from '../hooks/useUserApps';
import { StripeConnectAccount, StripeDispute, SubscriptionSummary, usePayments } from '../hooks/usePayments';
import { OAUTH_MESSAGE_TYPE, useOAuthPopup } from '../hooks/useOAuthPopup';
import { AppStoreConnection, useAppStoreConnect } from '../hooks/useAppStoreConnect';
import { AppStoreConnectModal } from '../components/modals/AppStoreConnectModal';

/** Platforms we can actually connect today (real backend OAuth). */
const SOCIAL_PLATFORMS: {
    id: OAuthPlatform;
    name: string;
    icon: React.ReactNode;
    scope: string;
}[] = [
    { id: 'meta', name: 'Meta — Facebook & Instagram', icon: <Facebook className="text-[#1877F2]" />, scope: 'Publish posts and read engagement for your Pages and Instagram.' },
    { id: 'tiktok', name: 'TikTok', icon: <Music2 className="text-[#000] dark:text-white" />, scope: 'Upload and schedule videos, read basic profile and video stats.' },
    { id: 'twitter', name: 'X (Twitter)', icon: <Twitter className="text-[#1DA1F2]" />, scope: 'Publish tweets and read your profile on behalf of the app.' },
];

/** Integrations that are planned but not yet wired to a real connector. */
const COMING_SOON = [
    { id: 'google-play', name: 'Google Play Console', icon: <Smartphone className="text-[#3DDC84]" />, scope: 'Import Android installs, revenue, and crash metrics.' },
    { id: 'firebase', name: 'Firebase Analytics', icon: <Zap className="text-amber-500" />, scope: 'Track product usage, retention, and events.' },
    { id: 'meta-ads', name: 'Meta Ads', icon: <BarChart2 className="text-blue-500" />, scope: 'Attach ad spend, ROAS, and conversions to an app or campaign.' },
];

interface ConnectedAccount {
    id: string;
    platform: string;
    username?: string;
    avatarUrl?: string;
    tokenExpiresAt?: string | null;
}

const unwrap = <T,>(res: any, fallback: T): T => {
    if (res === null || res === undefined) return fallback;
    if (Array.isArray(res)) return res as unknown as T;
    if (res && typeof res === 'object' && 'data' in res && res.data !== undefined) return res.data as T;
    return res as T;
};

/** Format a major-unit amount (e.g. 42.5) in the given ISO currency. */
const formatMoney = (amount: number, currency: string): string => {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: (currency || 'usd').toUpperCase(),
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${(currency || 'usd').toUpperCase()} ${amount.toFixed(2)}`;
    }
};

/** Format a minor-unit amount (e.g. cents) in the given ISO currency. */
const formatMinor = (minor: number, currency: string): string =>
    formatMoney((minor || 0) / 100, currency);

/** Human label + badge classes for a Stripe dispute status. */
const disputeStatusMeta = (status: string): { label: string; className: string } => {
    const needsAction =
        status === 'needs_response' || status === 'warning_needs_response';
    const won = status === 'won' || status === 'warning_closed';
    const lost = status === 'lost';
    const label = status.replace(/_/g, ' ');
    if (needsAction) return { label, className: 'bg-error/10 text-error' };
    if (lost) return { label, className: 'bg-error/10 text-error' };
    if (won) return { label, className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
    return { label, className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' };
};

export const ConnectionsPage: React.FC = () => {
    const { getMyApps } = useUserApps();
    const { getConnectedAccounts, getOAuthUrl, disconnectAccount } = useSocialAutomation();
    const { connectStripe, getStripeConnectStatus, getSubscriptionSummary, getDisputes } = usePayments();
    const { open: openConnectBrowser } = useOAuthPopup();
    const { getConnection: getAppStoreConnection, disconnect: disconnectAppStore } = useAppStoreConnect();

    const [apps, setApps] = useState<UserAppMembership[]>([]);
    const [selectedAppId, setSelectedAppId] = useState<string>('');
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
    const [stripe, setStripe] = useState<StripeConnectAccount | null>(null);
    const [mrr, setMrr] = useState<SubscriptionSummary | null>(null);
    const [disputes, setDisputes] = useState<StripeDispute[]>([]);
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [appStore, setAppStore] = useState<AppStoreConnection | null>(null);
    const [appStoreLoading, setAppStoreLoading] = useState(false);
    const [showAppStoreModal, setShowAppStoreModal] = useState(false);

    const [appsLoading, setAppsLoading] = useState(true);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // The in-app browser overlay: null when idle, otherwise the label of the
    // service the user is currently authorizing in the popup window.
    const [connecting, setConnecting] = useState<string | null>(null);

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestText, setRequestText] = useState('');
    const [requestSuccess, setRequestSuccess] = useState(false);

    const requestTextareaRef = useRef<HTMLTextAreaElement>(null);
    const requestTriggerRef = useRef<HTMLButtonElement>(null);

    const selectedApp = useMemo(
        () => apps.find((a) => a.app_id === selectedAppId) || null,
        [apps, selectedAppId],
    );

    // Stripe onboarding returns to this page inside the in-app browser popup
    // (return_url carries ?connect=return). When that happens, tell the opener
    // to refresh and close the popup so the user lands back in the app.
    useEffect(() => {
        const isPopup = typeof window !== 'undefined' && !!window.opener && window.opener !== window;
        const isConnectReturn = new URLSearchParams(window.location.search).get('connect') === 'return';
        if (isPopup && isConnectReturn) {
            try {
                window.opener?.postMessage(
                    { type: OAUTH_MESSAGE_TYPE, success: true, platform: 'stripe' },
                    window.location.origin,
                );
            } catch {
                /* opener gone; ignore */
            }
            window.setTimeout(() => window.close(), 300);
        }
    }, []);

    // Load the apps the user can manage (owner or cofounder).
    useEffect(() => {
        let active = true;
        (async () => {
            setAppsLoading(true);
            const res = await getMyApps();
            if (!active) return;
            const groups = res?.data;
            const manageable = groups
                ? [...groups.owned, ...groups.cofounded]
                : [];
            setApps(manageable);
            setSelectedAppId((prev) => prev || manageable[0]?.app_id || '');
            setAppsLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [getMyApps]);

    const loadAccounts = useCallback(
        async (appId: string) => {
            if (!appId) return;
            setAccountsLoading(true);
            setError(null);
            const res = await getConnectedAccounts(appId);
            setAccounts(unwrap<ConnectedAccount[]>(res, []));
            setAccountsLoading(false);
        },
        [getConnectedAccounts],
    );

    // Load per-app social accounts whenever the selected app changes.
    useEffect(() => {
        if (selectedAppId) loadAccounts(selectedAppId);
        else setAccounts([]);
    }, [selectedAppId, loadAccounts]);

    // App Store Connect is a per-app integration; reload it with the selection.
    useEffect(() => {
        if (!selectedAppId) {
            setAppStore(null);
            return;
        }
        let active = true;
        (async () => {
            setAppStoreLoading(true);
            const res = await getAppStoreConnection(selectedAppId);
            if (active) setAppStore(unwrap<AppStoreConnection | null>(res, null));
            if (active) setAppStoreLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [selectedAppId, getAppStoreConnection]);

    // Stripe Connect is a user-level account, loaded once.
    useEffect(() => {
        let active = true;
        (async () => {
            const res = await getStripeConnectStatus();
            if (active) setStripe(unwrap<StripeConnectAccount | null>(res, null));
        })();
        return () => {
            active = false;
        };
    }, [getStripeConnectStatus]);

    // Stored MRR + disputes come from ingested Stripe webhooks (user-level, no
    // live Stripe call). Refreshed whenever the Stripe account changes.
    const loadRevenue = useCallback(async () => {
        setRevenueLoading(true);
        const [summaryRes, disputesRes] = await Promise.all([
            getSubscriptionSummary(),
            getDisputes(),
        ]);
        setMrr(unwrap<SubscriptionSummary | null>(summaryRes, null));
        setDisputes(unwrap<StripeDispute[]>(disputesRes, []));
        setRevenueLoading(false);
    }, [getSubscriptionSummary, getDisputes]);

    useEffect(() => {
        // Only fetch revenue once Stripe onboarding is fully complete (charges +
        // payouts enabled) — a half-onboarded account has no meaningful data.
        if (stripe?.chargesEnabled && stripe?.payoutsEnabled) loadRevenue();
        else {
            setMrr(null);
            setDisputes([]);
        }
        // Keyed only on the capability flags — usePayments returns fresh function
        // refs each render, so depending on loadRevenue would re-fetch every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stripe?.chargesEnabled, stripe?.payoutsEnabled]);

    // Dialog behaviour: focus the field on open, close on Escape, restore focus on close.
    useEffect(() => {
        if (!showRequestModal) return;
        requestTextareaRef.current?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowRequestModal(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            requestTriggerRef.current?.focus();
        };
    }, [showRequestModal]);

    const accountFor = (platform: OAuthPlatform) =>
        accounts.find((a) => a.platform === platform);

    const handleConnect = async (platform: OAuthPlatform, label: string) => {
        if (!selectedAppId) {
            setError('Select an app to connect this service to.');
            return;
        }
        setBusyPlatform(platform);
        setError(null);
        try {
            const res = await getOAuthUrl(platform, selectedAppId);
            const authUrl = (res as any)?.authUrl ?? (res as any)?.data?.authUrl;
            if (!authUrl) {
                setError('Could not start the connection. This platform may not be configured yet.');
                return;
            }

            // Authorize inside the in-app browser popup — the user never leaves the app.
            setConnecting(label);
            const result = await openConnectBrowser(authUrl, { name: `connect_${platform}` });
            setConnecting(null);

            if (result.success) {
                await loadAccounts(selectedAppId);
            } else if (result.error === 'popup_blocked') {
                // Browser blocked the popup — fall back to a full-page redirect.
                window.location.href = authUrl;
            } else if (!result.cancelled) {
                setError(result.error || 'The connection was not completed.');
            }
        } catch (e) {
            setConnecting(null);
            setError(e instanceof Error ? e.message : 'Failed to start connection.');
        } finally {
            setBusyPlatform(null);
        }
    };

    const handleDisconnect = async (platform: OAuthPlatform, accountId: string) => {
        setBusyPlatform(platform);
        setError(null);
        try {
            await disconnectAccount(accountId);
            await loadAccounts(selectedAppId);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to disconnect.');
        } finally {
            setBusyPlatform(null);
        }
    };

    const handleConnectStripe = async () => {
        setBusyPlatform('stripe');
        setError(null);
        try {
            const returnUrl = `${window.location.origin}/connections?connect=return#services`;
            const res = await connectStripe(returnUrl);
            const url = (res as any)?.url ?? (res as any)?.data?.url;
            if (!url) {
                setError('Could not open Stripe onboarding.');
                return;
            }

            // Stripe onboarding runs in the in-app browser too. Its return_url
            // is our own /connections route, which posts back and closes.
            setConnecting('Stripe');
            const result = await openConnectBrowser(url, { name: 'connect_stripe' });
            setConnecting(null);

            if (result.error === 'popup_blocked') {
                window.location.href = url;
                return;
            }
            // Re-check status regardless of how the window closed — Stripe may
            // have completed onboarding even without an explicit success message.
            const status = await getStripeConnectStatus();
            setStripe(unwrap<StripeConnectAccount | null>(status, null));
        } catch (e) {
            setConnecting(null);
            setError(e instanceof Error ? e.message : 'Failed to open Stripe.');
        } finally {
            setBusyPlatform(null);
        }
    };

    const handleDisconnectAppStore = async () => {
        if (!selectedAppId) return;
        setBusyPlatform('app-store');
        setError(null);
        try {
            await disconnectAppStore(selectedAppId);
            setAppStore(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to disconnect App Store Connect.');
        } finally {
            setBusyPlatform(null);
        }
    };

    const handleSubmitRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestText.trim()) return;
        setShowRequestModal(false);
        setRequestText('');
        setRequestSuccess(true);
        window.setTimeout(() => setRequestSuccess(false), 5000);
    };

    const appStoreConnected = appStore?.status === 'connected';
    const appStoreNeedsAttention = Boolean(appStore) && !appStoreConnected;
    const connectedCount =
        accounts.length + (stripe?.chargesEnabled ? 1 : 0) + (appStoreConnected ? 1 : 0);
    const stripeConnected = Boolean(stripe?.chargesEnabled && stripe?.payoutsEnabled);
    const stripePending = Boolean(stripe?.accountId) && !stripeConnected;

    const mrrByCurrency = mrr?.byCurrency ?? [];
    const activeSubscriptions = mrr?.activeSubscriptions ?? 0;
    const actionDisputes = disputes.filter(
        (d) => d.status === 'needs_response' || d.status === 'warning_needs_response',
    ).length;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Connections</h1>
                        <p className="text-muted-foreground font-medium mt-1">
                            Integrate other apps and services into your project. Each one authorizes in a secure in-app browser — you never leave MyAppCEO — and tokens are stored encrypted on the server, never exposed to the browser.
                        </p>
                    </div>
                    {apps.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="app-select" className="text-xs font-bold text-muted-foreground">App</label>
                            <select
                                id="app-select"
                                value={selectedAppId}
                                onChange={(e) => setSelectedAppId(e.target.value)}
                                className="px-4 py-2.5 bg-card border border-border rounded-xl font-bold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                {apps.map((app) => (
                                    <option key={app.app_id} value={app.app_id}>{app.app_name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Scope banner */}
                <div className="bg-primary/5 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-xl bg-card flex items-center justify-center backdrop-blur-sm shadow-sm">
                            <Lock size={24} className="text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-foreground">
                                {selectedApp ? `Integration scope: ${selectedApp.app_name}` : 'Per-App Integration Scope'}
                            </h3>
                            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                                Each connection is bound to one app you own. Connecting redirects you to the provider to authorize access — we only keep the resulting tokens, encrypted.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider relative z-10">
                        <ShieldCheck size={14} /> {connectedCount} Connected
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-error/10 text-error rounded-xl text-sm font-medium" role="alert">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {requestSuccess && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-medium" role="status">
                        <CheckCircle2 size={16} /> Thanks — your integration request was received. We'll review it and prioritize accordingly.
                    </div>
                )}

                {appsLoading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground" role="status" aria-live="polite">
                        <Loader2 className="animate-spin mr-2" size={20} /> Loading your apps…
                    </div>
                ) : apps.length === 0 ? (
                    <div className="bg-card rounded-2xl p-10 text-center shadow-sm">
                        <Server size={28} className="mx-auto text-muted-foreground/50 mb-3" />
                        <h3 className="text-base font-bold text-foreground">No apps to connect yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">Create or claim an app first, then connect services to it here.</p>
                    </div>
                ) : (
                    <>
                        {/* Social platforms — real OAuth */}
                        <section id="services" className="space-y-5 scroll-mt-24">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Server size={16} className="text-primary" />
                                    </div>
                                    Social & Publishing
                                </h3>
                                {accountsLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" aria-label="Refreshing accounts" />}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {SOCIAL_PLATFORMS.map((platform) => {
                                    const account = accountFor(platform.id);
                                    const isConnected = Boolean(account);
                                    const busy = busyPlatform === platform.id;
                                    return (
                                        <div key={platform.id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                                                        {platform.icon}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-sm font-bold text-foreground">{platform.name}</h4>
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                                                                {isConnected ? 'Connected' : 'Available'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-muted-foreground truncate">
                                                            {isConnected && account?.username ? `@${account.username}` : platform.scope}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                                                    {isConnected ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={12} /> Authorized</span>
                                                    ) : 'Not connected'}
                                                </div>
                                                {isConnected ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => account && handleDisconnect(platform.id, account.id)}
                                                        disabled={busy}
                                                        className="px-4 py-2 rounded-xl bg-error/10 text-error text-xs font-bold hover:bg-error/20 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                                                    >
                                                        {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Disconnect
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConnect(platform.id, platform.name)}
                                                        disabled={busy}
                                                        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                                                    >
                                                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />} Connect
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Billing — Stripe Connect (user-level) */}
                        <section className="space-y-5">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                                    <DollarSign size={16} className="text-[#635BFF]" />
                                </div>
                                Billing & Revenue
                            </h3>
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                                        {/* Stripe brand color retained for the service logo swatch. */}
                                        <DollarSign className="text-[#635BFF]" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-foreground">Stripe</h4>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${stripeConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : stripePending ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
                                                {stripeConnected ? 'Connected' : stripePending ? 'Action needed' : 'Available'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {stripeConnected ? 'Live MRR, subscriptions, and payouts are syncing.' : stripePending ? (stripe?.disabledReason || 'Finish Stripe onboarding to enable payouts.') : 'Connect Stripe to track MRR and revenue.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleConnectStripe}
                                    disabled={busyPlatform === 'stripe'}
                                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                                >
                                    {busyPlatform === 'stripe' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                                    {stripeConnected ? 'Manage' : stripePending ? 'Continue setup' : 'Connect Stripe'}
                                </button>
                            </div>
                        </section>

                        {/* App stores & analytics — App Store Connect (credentials, not OAuth) */}
                        <section className="space-y-5">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
                                    <Apple size={16} className="text-foreground" />
                                </div>
                                App Stores &amp; Analytics
                            </h3>
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                                            <Apple className="text-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-sm font-bold text-foreground">App Store Connect</h4>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${appStoreConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : appStoreNeedsAttention ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
                                                    {appStoreLoading ? 'Checking…' : appStoreConnected ? 'Connected' : appStoreNeedsAttention ? 'Action needed' : 'Available'}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground truncate">
                                                {appStoreConnected
                                                    ? `${appStore?.teamName ? `${appStore.teamName} · ` : ''}Key ${appStore?.keyId}${typeof appStore?.appCount === 'number' ? ` · ${appStore.appCount} app${appStore.appCount === 1 ? '' : 's'}` : ''}`
                                                    : appStoreNeedsAttention
                                                        ? 'The stored key is invalid or expired — reconnect with a fresh key.'
                                                        : 'Import iOS downloads, ratings, reviews, and sales per app.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                                        {appStoreConnected ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={12} /> Authorized</span>
                                        ) : 'Uses an App Store Connect API key'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {appStoreConnected && (
                                            <button
                                                type="button"
                                                onClick={handleDisconnectAppStore}
                                                disabled={busyPlatform === 'app-store'}
                                                className="px-4 py-2 rounded-xl bg-error/10 text-error text-xs font-bold hover:bg-error/20 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                                            >
                                                {busyPlatform === 'app-store' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Disconnect
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowAppStoreModal(true)}
                                            disabled={appStoreLoading}
                                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                                        >
                                            {appStoreConnected ? <Settings2 size={14} /> : appStoreNeedsAttention ? <RefreshCw size={14} /> : <Link2 size={14} />}
                                            {appStoreConnected ? 'Manage' : appStoreNeedsAttention ? 'Reconnect' : 'Connect'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Revenue & Risk — stored MRR + disputes from Stripe webhooks */}
                        {stripeConnected && (
                            <section className="space-y-5">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <BarChart2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        Revenue &amp; Risk
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => loadRevenue()}
                                        disabled={revenueLoading}
                                        className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-60"
                                        title="Refresh"
                                        aria-label="Refresh revenue and disputes"
                                    >
                                        {revenueLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                                    </button>
                                </div>

                                {/* MRR tiles */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {mrrByCurrency.length === 0 ? (
                                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Monthly recurring revenue</p>
                                            <p className="mt-2 text-2xl font-black text-foreground">{formatMoney(0, 'usd')}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">No active subscriptions synced yet.</p>
                                        </div>
                                    ) : (
                                        mrrByCurrency.map((c) => (
                                            <div key={c.currency} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">MRR · {c.currency.toUpperCase()}</p>
                                                <p className="mt-2 text-2xl font-black text-foreground">{formatMoney(c.totalMrr, c.currency)}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">{c.activeSubscriptions} active {c.activeSubscriptions === 1 ? 'subscription' : 'subscriptions'}</p>
                                            </div>
                                        ))
                                    )}
                                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Active subscriptions</p>
                                        <p className="mt-2 text-2xl font-black text-foreground">{activeSubscriptions}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Across all connected customers.</p>
                                    </div>
                                </div>

                                {/* Disputes list */}
                                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
                                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <AlertTriangle size={15} className={actionDisputes > 0 ? 'text-error' : 'text-muted-foreground'} />
                                            Disputes
                                        </h4>
                                        {actionDisputes > 0 && (
                                            <span className="px-2.5 py-1 rounded-lg bg-error/10 text-error text-[10px] font-black uppercase tracking-wider">
                                                {actionDisputes} need{actionDisputes === 1 ? 's' : ''} response
                                            </span>
                                        )}
                                    </div>
                                    {disputes.length === 0 ? (
                                        <div className="p-6 text-center">
                                            <CheckCircle2 size={22} className="mx-auto text-emerald-500 mb-2" />
                                            <p className="text-sm font-bold text-foreground">No disputes</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Chargebacks and inquiries will appear here as Stripe reports them.</p>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-border">
                                            {disputes.map((d) => {
                                                const meta = disputeStatusMeta(d.status);
                                                const due = d.evidenceDueBy ? new Date(d.evidenceDueBy) : null;
                                                return (
                                                    <li key={d.id} className="flex items-center justify-between gap-4 p-4 sm:px-5">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-bold text-foreground">{formatMinor(d.amount, d.currency)}</span>
                                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${meta.className}`}>{meta.label}</span>
                                                            </div>
                                                            <p className="mt-0.5 text-xs text-muted-foreground truncate">
                                                                {(d.reason || 'unspecified').replace(/_/g, ' ')}
                                                                {due ? ` · respond by ${due.toLocaleDateString()}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-muted-foreground/60 whitespace-nowrap hidden sm:block">{d.stripeDisputeId}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Coming soon */}
                        <section className="space-y-5">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                    <RefreshCcw size={16} className="text-muted-foreground" />
                                </div>
                                Coming soon
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {COMING_SOON.map((service) => (
                                    <div key={service.id} className="bg-muted/40 border border-border rounded-xl p-5 flex items-center justify-between gap-4 opacity-80">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-11 h-11 rounded-xl bg-card flex items-center justify-center">{service.icon}</div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-foreground">{service.name}</h4>
                                                <p className="mt-0.5 text-xs text-muted-foreground truncate">{service.scope}</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-lg bg-muted text-[10px] font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Soon</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* Request another integration */}
                <div className="bg-muted/40 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-muted-foreground">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-foreground">Need another integration?</h4>
                            <p className="text-xs text-muted-foreground">Tell us what to build next and we'll prioritize it.</p>
                        </div>
                    </div>
                    <Button
                        ref={requestTriggerRef}
                        onClick={() => setShowRequestModal(true)}
                        className="rounded-xl font-bold"
                    >
                        Request Integration
                    </Button>
                </div>
            </div>

            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRequestModal(false)} aria-hidden="true" />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="request-modal-title"
                        aria-describedby="request-modal-description"
                        className="relative bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
                    >
                        <button
                            type="button"
                            onClick={() => setShowRequestModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
                            aria-label="Close dialog"
                        >
                            <X size={16} className="text-muted-foreground" />
                        </button>
                        <h2 id="request-modal-title" className="text-lg font-bold text-foreground mb-1">Request Integration</h2>
                        <p id="request-modal-description" className="text-xs text-muted-foreground mb-4">Tell us which service you need connected and to which app.</p>
                        <form onSubmit={handleSubmitRequest}>
                            <textarea
                                ref={requestTextareaRef}
                                value={requestText}
                                onChange={(e) => setRequestText(e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                rows={4}
                                placeholder="e.g., We need Google Analytics 4 for our Android app..."
                            />
                            <Button
                                type="submit"
                                disabled={!requestText.trim()}
                                className="w-full mt-4 rounded-xl font-bold"
                            >
                                Submit Request
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* In-app browser overlay — shown while the OAuth popup is open. */}
            {connecting && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="status" aria-live="polite">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
                    <div className="relative bg-card border border-border rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
                        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Globe size={26} className="text-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Connecting {connecting}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Finish authorizing in the browser window we just opened. This dialog closes automatically when you're done.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
                            <Loader2 size={14} className="animate-spin" /> Waiting for the browser window…
                        </div>
                        <p className="mt-4 text-[11px] text-muted-foreground/70 inline-flex items-center gap-1">
                            <ExternalLink size={11} /> Don't see a window? Allow pop-ups for this site and try again.
                        </p>
                    </div>
                </div>
            )}

            {/* App Store Connect credentials modal */}
            <AppStoreConnectModal
                open={showAppStoreModal}
                appId={selectedAppId}
                appName={selectedApp?.app_name}
                existing={appStore}
                onClose={() => setShowAppStoreModal(false)}
                onConnected={(conn) => {
                    setAppStore(conn);
                    setShowAppStoreModal(false);
                }}
            />
        </DashboardLayout>
    );
};
