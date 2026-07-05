import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Link, useNavigate } from 'react-router-dom';
import {
    Rocket,
    Lightbulb,
    Target,
    TrendingUp,
    PieChart,
    FolderKanban,
    Clock,
    ArrowRight,
    Zap,
    ChevronRight,
    AlertCircle,
    UsersRound,
    Briefcase,
    Crown,
    Scale,
    UploadCloud,
    Megaphone,
    Store,
    Link2,
    Settings,
    HelpCircle,
    FileText,
    LineChart,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserStatus } from '../hooks/useUserStatus';
import { useCrowdfunding } from '../hooks/useCrowdfundingSupabase';
import { useIdeas } from '../hooks/useIdeas';
import { useShareholderSystem } from '../hooks/useShareholderSystem';
import { useUserApps, UserAppMembership } from '../hooks/useUserApps';
import { usePayments } from '../hooks/usePayments';
import { OnboardingHint } from '../components/OnboardingHint';
import { WorkspaceStartGrid, WorkspaceStartOption } from '../components/WorkspaceStartGrid';
import { Button, EmptyState, LoadingState } from '../components/ui';
import { formatCurrency, formatNumber } from '../utils/format';

export const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { profile, isVerified, isLoading: profileLoading } = useUserStatus();
    const { getMyCampaigns } = useCrowdfunding();
    const { getMyIdeas } = useIdeas();
    const { getMyRequests } = useShareholderSystem();
    const { getMyApps } = useUserApps();
    const { getSubscriptionSummary } = usePayments();
    const navigate = useNavigate();

    const [ideasCount, setIdeasCount] = useState(0);
    const [campaignsCount, setCampaignsCount] = useState(0);
    const [activeCampaigns, setActiveCampaigns] = useState(0);
    const [ownedApps, setOwnedApps] = useState<UserAppMembership[]>([]);
    const [cofoundedApps, setCofoundedApps] = useState<UserAppMembership[]>([]);
    const [shareholderApps, setShareholderApps] = useState<UserAppMembership[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
    // Stored MRR summary (from ingested Stripe webhooks). Shows the top currency.
    const [mrr, setMrr] = useState<{ total: number; currency: string; active: number } | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const res = await getSubscriptionSummary();
            const summary = (res as any)?.data ?? res;
            const byCurrency = summary?.byCurrency ?? [];
            if (!mounted || byCurrency.length === 0) return;
            // Surface the currency with the largest MRR as the headline figure.
            const top = [...byCurrency].sort((a, b) => b.totalMrr - a.totalMrr)[0];
            setMrr({ total: top.totalMrr, currency: top.currency, active: summary.activeSubscriptions ?? 0 });
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            if (mounted) {
                setWorkspaceLoaded(false);
            }

            try {
                const ideasResult = await getMyIdeas();
                if (ideasResult.success && ideasResult.data) {
                    const ideas = (ideasResult.data as any).data || ideasResult.data;
                    if (mounted) setIdeasCount(ideas.length || 0);
                }
            } catch (err) {
                console.warn('Failed to load ideas:', err);
            }

            try {
                const campaignsResult = await getMyCampaigns();
                if (campaignsResult.success && campaignsResult.data) {
                    const campaigns = (campaignsResult.data as any).data || campaignsResult.data;
                    if (mounted) {
                        setCampaignsCount(campaigns.length || 0);
                        setActiveCampaigns(campaigns.filter((c: any) => c.status === 'active').length || 0);
                    }
                }
            } catch (err) {
                console.warn('Failed to load campaigns:', err);
            }

            // Fetch user's app memberships
            try {
                const appsResult = await getMyApps();
                if (appsResult.success && appsResult.data) {
                    if (mounted) {
                        setOwnedApps(appsResult.data.owned || []);
                        setCofoundedApps(appsResult.data.cofounded || []);
                        setShareholderApps(appsResult.data.shareholder || []);
                    }
                } else {
                    if (mounted) {
                        setOwnedApps([]);
                        setCofoundedApps([]);
                        setShareholderApps([]);
                    }
                }
            } catch (err) {
                console.warn('Failed to load app memberships:', err);
                if (mounted) {
                    setOwnedApps([]);
                    setCofoundedApps([]);
                    setShareholderApps([]);
                }
            }

            // Fetch pending shareholder requests
            try {
                const requestsResult = await getMyRequests() as any[] | { data?: any[] };
                const requests = Array.isArray(requestsResult)
                    ? requestsResult
                    : Array.isArray(requestsResult?.data)
                        ? requestsResult.data
                        : [];
                if (mounted) setPendingRequests(requests.filter((r: any) => r.status === 'pending'));
            } catch (err) {
                console.warn('Failed to load shareholder requests:', err);
            }

            if (mounted) {
                setWorkspaceLoaded(true);
            }
        };
        loadData();

        return () => {
            mounted = false;
        };
    }, [user?.id]);

    const totalApps = ownedApps.length + cofoundedApps.length + shareholderApps.length;
    const allApps = [...ownedApps, ...cofoundedApps, ...shareholderApps];
    const cofounderPath = ownedApps[0]?.app_id ? `/apps/${ownedApps[0].app_id}/team` : '/apps';
    const isFirstRun = workspaceLoaded && totalApps === 0;

    const firstRunOptions: WorkspaceStartOption[] = [
        {
            id: 'connect',
            eyebrow: 'Primary path',
            title: 'Connect an existing app',
            description: 'Bring in a live app, website, or SaaS product so we can read the public context and keep the workspace controlled.',
            note: 'Import flow',
            icon: UploadCloud,
            href: '/apps/new?mode=connect',
        },
        {
            id: 'upload',
            eyebrow: 'Private build',
            title: 'Upload an app bundle',
            description: 'Upload a package, export, or archive and attach it to a draft workspace for review.',
            note: 'Upload flow',
            icon: Store,
            href: '/apps/new?mode=upload',
        },
        {
            id: 'build',
            eyebrow: 'Builder request',
            title: 'Create a new app',
            description: 'Start in the builder, create the request, and route the result through admin review before it goes live.',
            note: 'Request flow',
            icon: Rocket,
            href: '/apps/new?mode=build',
        },
    ];

    if (!workspaceLoaded || profileLoading) {
        return (
            <DashboardLayout>
                <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
                    <LoadingState
                        title="Preparing your workspace..."
                        description="Loading your apps, ideas, and campaigns."
                        className="border-0 bg-transparent shadow-none"
                    />
                </div>
            </DashboardLayout>
        );
    }

    if (isFirstRun) {
        return (
            <DashboardLayout>
                <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
                    <div className="grid w-full gap-10 lg:grid-cols-[1.08fr_0.92fr]">
                        <div className="space-y-8">
                            <div className="max-w-2xl space-y-4">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">First run</p>
                                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                                    Choose the path that fits your app.
                                </h1>
                                <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                                    Keep the workspace quiet and controlled. Connect an app, upload a file bundle, or start a builder request. Nothing goes live before review.
                                </p>
                            </div>

                            <WorkspaceStartGrid options={firstRunOptions} />
                        </div>

                        <aside className="rounded-[32px] border border-border bg-card p-8 shadow-sm">
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Controlled setup</p>
                                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                    A clean start, not a crowded dashboard.
                                </h2>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    Your first workspace stays in draft until it is imported, uploaded, or sent through the builder request flow.
                                </p>
                            </div>

                            <div className="mt-8 space-y-4">
                                {[
                                    'Pick one path only.',
                                    'Review the captured details before submit.',
                                    'Move to the app dashboard only after persistence succeeds.',
                                ].map((item, index) => (
                                    <div key={item} className="flex items-start gap-4 rounded-2xl bg-muted p-4">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                                            0{index + 1}
                                        </div>
                                        <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const primaryActions = [
        {
            title: 'Add My App',
            description: 'Import an existing app, website, SaaS, or software product you already manage.',
            icon: UploadCloud,
            color: 'bg-primary',
            iconSurface: 'bg-white/18 text-white ring-1 ring-white/24',
            textColor: 'text-white',
            onClick: () => navigate('/apps/new?mode=connect'),
        },
        {
            title: 'Start New Idea',
            description: 'Create a new product idea and turn it into a structured app project.',
            icon: Rocket,
            path: '/ideas/new',
            color: 'bg-gradient-to-br from-primary to-primary/70',
            iconSurface: 'bg-white/18 text-white ring-1 ring-white/24',
            textColor: 'text-white',
        },
        {
            title: 'Browse Campaigns',
            description: 'Discover investment opportunities',
            icon: TrendingUp,
            path: '/campaigns',
            color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            iconSurface: 'bg-white/18 text-white ring-1 ring-white/24',
            textColor: 'text-white',
        },
    ];

    const overviewCards = [
        {
            title: 'Monthly Revenue',
            value: mrr
                ? new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: mrr.currency.toUpperCase(),
                      maximumFractionDigits: 0,
                  }).format(mrr.total)
                : formatCurrency(0, { maximumFractionDigits: 0 }),
            subtitle: mrr
                ? `${mrr.active} active ${mrr.active === 1 ? 'subscription' : 'subscriptions'}`
                : 'Connect Stripe to track',
            icon: TrendingUp,
            path: '/finances',
            color: 'text-emerald-500',
            bgIcon: 'bg-emerald-500/10',
        },
        {
            title: 'My Ideas',
            value: formatNumber(ideasCount),
            subtitle: `${ideasCount === 0 ? 'Start your first' : 'In progress'}`,
            icon: Lightbulb,
            path: '/my-ideas',
            color: 'text-amber-500',
            bgIcon: 'bg-amber-500/10',
        },
        {
            title: 'My Campaigns',
            value: formatNumber(campaignsCount),
            subtitle: `${activeCampaigns} active`,
            icon: Target,
            path: '/my-campaigns',
            color: 'text-emerald-500',
            bgIcon: 'bg-emerald-500/10',
        },
        {
            title: 'Portfolio',
            value: formatNumber(shareholderApps.length),
            subtitle: shareholderApps.length === 1 ? 'Investment held' : 'Investments held',
            icon: PieChart,
            path: '/portfolio',
            color: 'text-blue-500',
            bgIcon: 'bg-blue-500/10',
        },
        {
            title: 'My Apps',
            value: formatNumber(totalApps),
            subtitle: `${ownedApps.length} owned`,
            icon: FolderKanban,
            path: '/apps',
            color: 'text-violet-500',
            bgIcon: 'bg-violet-500/10',
        },
        {
            title: 'Team & Ownership',
            value: formatNumber(cofoundedApps.length),
            subtitle: 'Co-founded apps',
            icon: UsersRound,
            path: '/apps',
            color: 'text-cyan-500',
            bgIcon: 'bg-cyan-500/10',
        },
        {
            title: 'Legal & Licenses',
            value: '—',
            subtitle: 'Manage entity & licenses',
            icon: Scale,
            path: '/legal',
            color: 'text-rose-500',
            bgIcon: 'bg-rose-500/10',
        },
    ];
    const workspaceLinks = [
        { label: 'Apps', path: '/apps', icon: FolderKanban },
        { label: 'Ideas', path: '/my-ideas', icon: Lightbulb },
        { label: 'Campaigns', path: '/campaigns', icon: TrendingUp },
        { label: 'Portfolio', path: '/portfolio', icon: PieChart },
        { label: 'Legal', path: '/legal', icon: Scale },
        { label: 'Finances', path: '/finances', icon: Briefcase },
        { label: 'Analytics', path: '/analytics', icon: LineChart },
        { label: 'Marketplace', path: '/marketplace', icon: Store },
        { label: 'Promote', path: '/promote', icon: Megaphone },
        { label: 'Connections', path: '/connections', icon: Link2 },
        { label: 'Docs', path: '/documentation', icon: FileText },
        { label: 'Settings', path: '/settings', icon: Settings },
        { label: 'Support', path: '/support', icon: HelpCircle },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto py-8 space-y-8">
                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Welcome back, {profile?.fullName || user?.email?.split('@')[0] || 'there'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage existing apps, shape new ideas, and track ownership from one place.
                        </p>
                    </div>
                </div>

                {/* Verification Banner */}
                {!isVerified && !profileLoading && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Complete your profile</h3>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    Verify your account to unlock withdrawals.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => navigate('/settings?tab=kyc')}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            Verify Now
                        </Button>
                    </div>
                )}

                {/* Pending Shareholder Requests */}
                {pendingRequests.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <Briefcase size={18} className="text-blue-600 dark:text-blue-400" />
                            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200">
                                Pending Shareholder Applications ({pendingRequests.length})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {pendingRequests.slice(0, 3).map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-blue-500/10">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{req.listing?.name || 'App Investment'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {req.shares_requested} shares • {req.total_investment != null ? formatCurrency(req.total_investment, { maximumFractionDigits: 0 }) : 'TBD'}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-bold border border-amber-500/20">
                                        Pending
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contextual Hints */}
                <div className="space-y-3">
                    <OnboardingHint
                        hintKey="dashboard-invite-cofounder"
                        title="Bring on a co-founder"
                        description="Split equity, share the workload. Invite someone to build with you."
                        actionLabel="Invite Co-founder"
                        onAction={() => navigate(cofounderPath)}
                    />
                    <OnboardingHint
                        hintKey="dashboard-setup-legal"
                        title="Set up your legal entity"
                        description="Protect yourself and your co-founders with proper legal structure."
                        actionLabel="Set Up Entity"
                        onAction={() => navigate('/legal')}
                    />
                </div>

                <section className="rounded-2xl bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-foreground">Jump to workspace</h2>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fast navigation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                        {workspaceLinks.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex min-h-12 items-center gap-2 rounded-xl bg-muted px-3 text-xs font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                            >
                                <item.icon size={15} className="shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Primary Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {primaryActions.map((action, i) => {
                        const content = (
                            <>
                                <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
                                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${action.iconSurface}`}>
                                    <action.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-black tracking-normal">{action.title}</h3>
                                <p className="mt-1 max-w-[28ch] text-sm font-medium leading-5 text-white/84">{action.description}</p>
                                <ArrowRight className="absolute right-5 top-5 h-5 w-5 text-white/70 transition-transform group-hover:translate-x-0.5" />
                            </>
                        );

                        const className = `${action.color} ${action.textColor} group relative min-h-[168px] overflow-hidden rounded-2xl p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.98]`;

                        return action.path ? (
                            <Link key={i} to={action.path} className={className}>
                                {content}
                            </Link>
                        ) : (
                            <button key={i} type="button" onClick={action.onClick} className={className}>
                                {content}
                            </button>
                        );
                    })}
                </div>

                {/* Role-Based Portfolio Sections */}
                {(ownedApps.length > 0 || cofoundedApps.length > 0 || shareholderApps.length > 0) && (
                    <div className="space-y-6">
                        {/* My Apps (Owner) */}
                        {ownedApps.length > 0 && (
                            <div className="bg-card rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Crown size={16} className="text-amber-500" /> My Apps (Owner)
                                    </h2>
                                    <Link to="/apps" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                        View All <ChevronRight size={12} />
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {ownedApps.map((app) => (
                                        <Link key={app.app_id} to={`/apps/${app.app_id}/dashboard`} className="p-4 bg-muted rounded-xl shadow-sm hover:bg-muted/70 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                    <Crown size={16} className="text-amber-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{app.app_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{app.app_category}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Co-Founded */}
                        {cofoundedApps.length > 0 && (
                            <div className="bg-card rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <UsersRound size={16} className="text-blue-500" /> Co-Founded
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {cofoundedApps.map((app) => (
                                        <Link key={app.app_id} to={`/apps/${app.app_id}/dashboard`} className="p-4 bg-muted rounded-xl shadow-sm hover:bg-muted/70 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                    <UsersRound size={16} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{app.app_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{app.app_category}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Investments (Shareholder) */}
                        {shareholderApps.length > 0 && (
                            <div className="bg-card rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Briefcase size={16} className="text-emerald-500" /> My Investments
                                    </h2>
                                    <Link to="/my-investments" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                        View All <ChevronRight size={12} />
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {shareholderApps.map((app) => (
                                        <Link key={app.app_id} to={`/apps/${app.app_id}/dashboard`} className="p-4 bg-muted rounded-xl shadow-sm hover:bg-muted/70 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                    <Briefcase size={16} className="text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{app.app_name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{app.equity_pct}% stake</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {overviewCards.map((card, i) => (
                            <Link
                                key={i}
                                to={card.path}
                                className={`${i === 0 ? 'md:col-span-2' : ''} bg-card rounded-2xl p-4 shadow-sm hover:bg-muted transition-all group`}
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <div className={`w-10 h-10 rounded-xl ${card.bgIcon} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                        <card.icon className={`w-5 h-5 ${card.color}`} />
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                                <p className="text-sm font-semibold text-foreground mt-1">{card.title}</p>
                                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                            </Link>
                        ))}
                    </div>
                    <div className="rounded-2xl bg-card p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground">My apps</h2>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/apps/new')} className="text-primary hover:text-primary">
                                Add app
                            </Button>
                        </div>
                        {allApps.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={FolderKanban}
                                title="No apps added yet"
                                description="Add an existing app or start a new idea."
                                action={{ label: 'Add app', onClick: () => navigate('/apps/new') }}
                            />
                        ) : (
                            <div className="space-y-2">
                                {allApps.slice(0, 4).map((app) => (
                                    <Link key={`${app.role}-${app.app_id}`} to={`/apps/${app.app_id}/dashboard`} className="flex items-center justify-between rounded-xl bg-muted px-3 py-3 transition hover:bg-primary/10">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{app.app_name}</p>
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{app.role} / {app.app_category || 'App'}</p>
                                        </div>
                                        <ChevronRight size={15} className="text-primary" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent Activity */}
                <section className="bg-card rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Recent Activity
                        </h2>
                        <Link to="/analytics" className="text-xs font-bold text-primary hover:underline">
                            View analytics
                        </Link>
                    </div>
                    <EmptyState
                        icon={Zap}
                        title="Activity feed coming soon"
                        description="A unified timeline of app, idea, and campaign events will appear here once it ships. In the meantime, open analytics for the numbers you have today."
                        className="border-0 shadow-none"
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};
