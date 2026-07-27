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
    CheckCircle2,
    ShieldCheck,
    type LucideIcon,
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

                        <aside className="rounded-[32px] border border-border bg-card p-8">
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

    const revenueValue = mrr
        ? new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: mrr.currency.toUpperCase(),
              maximumFractionDigits: 0,
          }).format(mrr.total)
        : formatCurrency(0, { maximumFractionDigits: 0 });

    // ── Priority goals ────────────────────────────────────────────────────
    // A real setup/health checklist derived from the user's actual state. Each
    // goal is either detectably done or an actionable next step. Incomplete,
    // higher-priority goals float to the top; completed ones collapse to a
    // compact "done" row so progress stays visible without adding noise.
    type Priority = 1 | 2 | 3;
    interface PriorityGoal {
        id: string;
        title: string;
        description: string;
        icon: LucideIcon;
        accent: string; // icon foreground token
        accentBg: string; // icon surface token
        cta: string;
        onAction: () => void;
        done: boolean;
        priority: Priority;
    }

    const goals: PriorityGoal[] = [
        {
            id: 'verify',
            title: 'Verify your account',
            description: 'Complete KYC to unlock withdrawals and payouts.',
            icon: ShieldCheck,
            accent: 'text-amber-500',
            accentBg: 'bg-amber-500/10',
            cta: 'Verify now',
            onAction: () => navigate('/settings?tab=kyc'),
            done: isVerified,
            priority: 1,
        },
        {
            id: 'app',
            title: 'Add your first app',
            description: 'Import a live app or start a new build to open a workspace.',
            icon: UploadCloud,
            accent: 'text-primary',
            accentBg: 'bg-primary/10',
            cta: 'Add app',
            onAction: () => navigate('/apps/new?mode=connect'),
            done: totalApps > 0,
            priority: 1,
        },
        {
            id: 'revenue',
            title: 'Connect revenue tracking',
            description: 'Link Stripe to see MRR and active subscriptions here.',
            icon: TrendingUp,
            accent: 'text-emerald-500',
            accentBg: 'bg-emerald-500/10',
            cta: 'Connect Stripe',
            onAction: () => navigate('/connections'),
            done: !!mrr,
            priority: 2,
        },
        {
            id: 'idea',
            title: 'Capture an idea',
            description: 'Turn a concept into a structured, buildable app project.',
            icon: Lightbulb,
            accent: 'text-amber-500',
            accentBg: 'bg-amber-500/10',
            cta: 'New idea',
            onAction: () => navigate('/ideas/new'),
            done: ideasCount > 0,
            priority: 2,
        },
        {
            id: 'team',
            title: 'Build your team',
            description: 'Invite a co-founder and split equity on an app you own.',
            icon: UsersRound,
            accent: 'text-blue-500',
            accentBg: 'bg-blue-500/10',
            cta: 'Invite co-founder',
            onAction: () => navigate(cofounderPath),
            done: cofoundedApps.length > 0,
            priority: 3,
        },
        {
            id: 'legal',
            title: 'Set up your legal entity',
            description: 'Protect yourself and co-founders with proper structure.',
            icon: Scale,
            accent: 'text-rose-500',
            accentBg: 'bg-rose-500/10',
            cta: 'Set up entity',
            onAction: () => navigate('/legal'),
            done: campaignsCount > 0, // proxy: users who run campaigns have entities set up
            priority: 3,
        },
    ];

    const completedGoals = goals.filter((g) => g.done).length;
    const goalProgress = Math.round((completedGoals / goals.length) * 100);
    const openGoals = goals
        .filter((g) => !g.done)
        .sort((a, b) => a.priority - b.priority);
    const doneGoals = goals.filter((g) => g.done);

    const priorityLabel: Record<Priority, string> = { 1: 'Critical', 2: 'Recommended', 3: 'Optional' };
    const priorityPill: Record<Priority, string> = {
        1: 'bg-rose-500/10 text-rose-500',
        2: 'bg-primary/10 text-primary',
        3: 'bg-muted text-muted-foreground',
    };

    // ── Compact metrics + role metadata ───────────────────────────────────
    const metrics = [
        { label: 'Revenue', value: revenueValue, sub: mrr ? `${mrr.active} active` : 'Not connected', icon: TrendingUp, color: 'text-emerald-500', path: '/finances' },
        { label: 'Apps', value: formatNumber(totalApps), sub: `${ownedApps.length} owned`, icon: FolderKanban, color: 'text-violet-500', path: '/apps' },
        { label: 'Ideas', value: formatNumber(ideasCount), sub: ideasCount === 0 ? 'None yet' : 'In progress', icon: Lightbulb, color: 'text-amber-500', path: '/my-ideas' },
        { label: 'Campaigns', value: formatNumber(campaignsCount), sub: `${activeCampaigns} active`, icon: Target, color: 'text-blue-500', path: '/my-campaigns' },
        { label: 'Portfolio', value: formatNumber(shareholderApps.length), sub: shareholderApps.length === 1 ? 'Investment' : 'Investments', icon: PieChart, color: 'text-cyan-500', path: '/portfolio' },
    ];

    type RoleMeta = { label: string; icon: LucideIcon; accent: string; accentBg: string };
    const roleMeta: Partial<Record<UserAppMembership['role'], RoleMeta>> = {
        owner: { label: 'Owner', icon: Crown, accent: 'text-amber-500', accentBg: 'bg-amber-500/10' },
        cofounder: { label: 'Co-founder', icon: UsersRound, accent: 'text-blue-500', accentBg: 'bg-blue-500/10' },
        shareholder: { label: 'Investor', icon: Briefcase, accent: 'text-emerald-500', accentBg: 'bg-emerald-500/10' },
    };
    const defaultRoleMeta: RoleMeta = { label: 'Member', icon: FolderKanban, accent: 'text-primary', accentBg: 'bg-primary/10' };

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
            <div className="mx-auto max-w-6xl space-y-6 py-8">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Welcome back, {profile?.fullName || user?.email?.split('@')[0] || 'there'}
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Manage existing apps, shape new ideas, and track ownership from one place.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/ideas/new')} className="gap-2">
                            <Rocket className="h-4 w-4" /> New idea
                        </Button>
                        <Button onClick={() => navigate('/apps/new?mode=connect')} className="gap-2">
                            <UploadCloud className="h-4 w-4" /> Add app
                        </Button>
                    </div>
                </div>

                {/* Urgent: pending shareholder requests */}
                {pendingRequests.length > 0 && (
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                        <div className="mb-3 flex items-center gap-3">
                            <Briefcase size={18} className="text-blue-600 dark:text-blue-400" />
                            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200">
                                Pending shareholder applications ({pendingRequests.length})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {pendingRequests.slice(0, 3).map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between rounded-xl border border-blue-500/10 bg-card px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{req.listing?.name || 'App Investment'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {req.shares_requested} shares • {req.total_investment != null ? formatCurrency(req.total_investment, { maximumFractionDigits: 0 }) : 'TBD'}
                                        </p>
                                    </div>
                                    <span className="rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                        Pending
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Priority goals ─────────────────────────────────────── */}
                <section className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                                <Target className="h-4 w-4 text-primary" /> Priority goals
                            </h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {openGoals.length === 0
                                    ? 'All set — your workspace is fully configured.'
                                    : `${openGoals.length} step${openGoals.length === 1 ? '' : 's'} left to get the most out of your workspace.`}
                            </p>
                        </div>
                        <div className="sm:w-52">
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                <span>Setup progress</span>
                                <span className="text-foreground">{completedGoals}/{goals.length}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${goalProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {openGoals.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {openGoals.map((goal) => (
                                <div key={goal.id} className="flex flex-col rounded-xl border border-border bg-background p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${goal.accentBg}`}>
                                            <goal.icon className={`h-5 w-5 ${goal.accent}`} />
                                        </div>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityPill[goal.priority]}`}>
                                            {priorityLabel[goal.priority]}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-foreground">{goal.title}</h3>
                                    <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{goal.description}</p>
                                    <button
                                        type="button"
                                        onClick={goal.onAction}
                                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary transition hover:gap-2"
                                    >
                                        {goal.cta} <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {doneGoals.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                            {doneGoals.map((goal) => (
                                <span key={goal.id} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> {goal.title}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                {/* Contextual hints (dismissible) */}
                <div className="space-y-3">
                    <OnboardingHint
                        hintKey="dashboard-invite-cofounder"
                        title="Bring on a co-founder"
                        description="Split equity, share the workload. Invite someone to build with you."
                        actionLabel="Invite Co-founder"
                        onAction={() => navigate(cofounderPath)}
                    />
                </div>

                {/* ── Metrics strip ──────────────────────────────────────── */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {metrics.map((m) => (
                        <Link
                            key={m.label}
                            to={m.path}
                            className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <m.icon className={`h-4 w-4 ${m.color}`} />
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                            </div>
                            <p className="text-xl font-bold text-foreground">{m.value}</p>
                            <p className="text-xs font-semibold text-foreground">{m.label}</p>
                            <p className="text-[11px] text-muted-foreground">{m.sub}</p>
                        </Link>
                    ))}
                </section>

                {/* ── Your apps (real overview) ──────────────────────────── */}
                <section className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                            <FolderKanban className="h-4 w-4 text-primary" /> Your apps
                        </h2>
                        <Link to="/apps" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                            View all <ChevronRight size={12} />
                        </Link>
                    </div>

                    {allApps.length === 0 ? (
                        <EmptyState
                            size="sm"
                            icon={FolderKanban}
                            title="No apps yet"
                            description="Add an existing app or start a new idea to open your first workspace."
                            action={{ label: 'Add app', onClick: () => navigate('/apps/new') }}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {allApps.map((app) => {
                                const meta = roleMeta[app.role] ?? defaultRoleMeta;
                                return (
                                    <Link
                                        key={`${app.role}-${app.app_id}`}
                                        to={`/apps/${app.app_id}/dashboard`}
                                        className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:border-primary/40"
                                    >
                                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.accentBg}`}>
                                            <meta.icon className={`h-5 w-5 ${meta.accent}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-foreground">{app.app_name}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {meta.label}
                                                {app.role === 'shareholder' && app.equity_pct != null
                                                    ? ` • ${app.equity_pct}% stake`
                                                    : app.app_category
                                                        ? ` • ${app.app_category}`
                                                        : ''}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="shrink-0 text-muted-foreground transition group-hover:text-primary" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ── Quick navigation ───────────────────────────────────── */}
                <section className="rounded-2xl border border-border bg-card p-4">
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

                {/* ── Recent activity ────────────────────────────────────── */}
                <section className="rounded-2xl border border-border bg-card p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                            <Clock className="h-4 w-4 text-primary" />
                            Recent activity
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
