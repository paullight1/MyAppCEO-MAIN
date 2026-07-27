import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    LayoutDashboard,
    Users,
    Rocket,
    FileText,
    CheckCircle2,
    Clock,
    TrendingUp,
    ChevronRight,
    Plus,
    Scale,
    TableProperties,
    Building2,
    ArrowLeftRight,
    RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDevelopment, DevelopmentPhase, DeploymentRecord, ProgressUpdate } from '../hooks/useDevelopment';
import { PostUpdateModal } from '../components/modals/PostUpdateModal';
import { AddTeamMemberModal } from '../components/modals/AddTeamMemberModal';
import { AppLifecycleTracker } from '../components/AppLifecycleTracker';
import { flattenUserApps, useUserApps, UserAppMembership } from '../hooks/useUserApps';
import { useDashboardData } from '../hooks/useDashboardData';
import { validateUrl } from '../utils/security';
import { Button, EmptyState, ErrorState, LoadingState, StatTile } from '../components/ui';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';

const PHASE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
    in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    blocked: { label: 'Blocked', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    skipped: { label: 'Skipped', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

const DEPLOYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    preparing: { label: 'Preparing', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', dot: 'bg-slate-400' },
    submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', dot: 'bg-blue-500' },
    in_review: { label: 'In Review', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500' },
    approved: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-600 border-red-500/20', dot: 'bg-red-500' },
    live: { label: 'LIVE', color: 'bg-green-500/10 text-green-700 border-green-500/20', dot: 'bg-green-500' },
};

const PLATFORM_CONFIG: Record<string, { label: string; icon: string }> = {
    ios: { label: 'iOS', icon: '🍎' },
    android: { label: 'Android', icon: '🤖' },
    web: { label: 'Web', icon: '🌐' },
    desktop: { label: 'Desktop', icon: '💻' },
};

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'phases', label: 'Phases', icon: TrendingUp },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'updates', label: 'Updates', icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

export const AppDashboardPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getAppProgress, initializePhases } = useDevelopment();
    const { getMyApps } = useUserApps();
    const { data: overview, isLoading: overviewLoading, error: overviewError, refetch: refetchOverview } = useDashboardData(id);

    const [progress, setProgress] = useState<any>(null);
    const [currentApp, setCurrentApp] = useState<UserAppMembership | null>(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressError, setProgressError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [showPostUpdateModal, setShowPostUpdateModal] = useState(false);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);

    useEffect(() => {
        loadProgress();
    }, [id]);

    const loadProgress = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        setProgressError(null);

        const appsResult = await getMyApps();
        const userApps = appsResult.success && appsResult.data ? flattenUserApps(appsResult.data) : [];
        const app = userApps.find((item) => item.app_id === id) || null;
        setCurrentApp(app);

        if (!app) {
            setError('You do not have access to this app workspace, or it no longer exists.');
            setLoading(false);
            return;
        }

        const result = await getAppProgress(id);
        if (result.success && result.data) {
            setProgress((result.data as any).data || result.data);
        } else {
            const message = result.error || 'Development tracking has not been initialized for this app.';
            if (/permission|access denied|forbidden|403/i.test(message)) {
                setError('You do not have permission to view this app dashboard.');
            } else {
                setProgress(null);
                setProgressError(null);
            }
        }
        setLoading(false);
    };

    const handleInitialize = async () => {
        if (!id) return;
        setInitializing(true);
        const result = await initializePhases(id);
        if (result.success && result.data) {
            setProgress((result.data as any).data || result.data);
            setProgressError(null);
        }
        setInitializing(false);
    };

    const getCurrentPhase = (): DevelopmentPhase | null => {
        if (!progress?.phases) return null;
        return progress.phases.find((p: DevelopmentPhase) => p.status === 'in_progress') || progress.phases[0] || null;
    };

    const appRole = currentApp?.role || 'prospective';
    const canManage = appRole === 'owner' || appRole === 'cofounder';
    const canFundraise = appRole === 'owner';
    const canViewCapTable = appRole === 'owner' || appRole === 'cofounder';
    const canViewLegal = appRole === 'owner' || appRole === 'cofounder' || appRole === 'shareholder';

    const coreActions = [
        { label: 'Team', detail: 'Invite co-founders', icon: Users, path: `/apps/${id}/team`, visible: canManage },
        { label: 'Funding', detail: 'Create a raise', icon: Rocket, path: `/campaigns/new?appId=${id}`, visible: canFundraise },
        { label: 'Cap table', detail: 'Review ownership', icon: TableProperties, path: `/apps/${id}/cap-table`, visible: canViewCapTable },
        { label: 'Equity', detail: 'Propose splits', icon: ArrowLeftRight, path: `/apps/${id}/equity`, visible: canViewCapTable },
        { label: 'Legal entity', detail: 'Incorporate', icon: Building2, path: `/apps/${id}/formation`, visible: canManage },
        { label: 'Legal', detail: 'Licenses', icon: Scale, path: `/apps/${id}/legal`, visible: canViewLegal },
    ].filter((action) => action.visible);

    const setupChecklist = [
        { label: 'Initialize lifecycle tracking', complete: Boolean(progress?.phases?.length), action: 'Initialize', onClick: handleInitialize, visible: canManage },
        { label: 'Invite at least one collaborator', complete: Boolean(progress?.team?.length), path: `/apps/${id}/team`, visible: canManage },
        { label: 'Review ownership records', complete: currentApp?.setup_complete === true || appRole === 'shareholder', path: `/apps/${id}/cap-table`, visible: canViewCapTable },
        { label: 'Add first deployment record', complete: Boolean(progress?.deployments?.length), path: `/apps/${id}/deployments/new`, visible: canManage },
    ].filter((item) => item.visible);
    const showSetupChecklist = Boolean(currentApp && canManage && setupChecklist.some((item) => !item.complete));

    const renderCoreActions = () => coreActions.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {coreActions.map((item) => (
                <Link
                    key={item.label}
                    to={item.path}
                    className="group rounded-2xl bg-card border border-border p-4 text-left transition hover:bg-primary/10"
                >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <item.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </Link>
            ))}
        </div>
    ) : null;

    const renderOverviewCards = () => {
        // Trend chips only render when analytics are actually loaded (the API returns
        // point values with these deltas — there is no time-series to plot a sparkline from).
        const hasOverview = Boolean(overview) && !overviewLoading;
        const mrrChange = overview?.mrr?.change;
        const userGrowth = overview?.users?.growth;
        const valMultiple = overview?.valuation?.multiple;

        const cards: Array<{ label: string; value: React.ReactNode; trend?: { value: string; positive?: boolean } }> = [
            {
                label: 'MRR',
                value: overviewLoading ? 'Loading' : overview ? formatCurrency(Number(overview.mrr?.value ?? 0), { maximumFractionDigits: 0 }) : 'Not connected',
                trend: hasOverview && Number.isFinite(mrrChange)
                    ? { value: formatPercent(mrrChange, { signed: true }), positive: (mrrChange ?? 0) > 0 }
                    : undefined,
            },
            {
                label: 'Monthly Users',
                value: overviewLoading ? 'Loading' : overview ? formatNumber(Number(overview.users?.mau ?? 0)) : 'Not connected',
                trend: hasOverview && Number.isFinite(userGrowth)
                    ? { value: formatPercent(userGrowth, { signed: true }), positive: (userGrowth ?? 0) > 0 }
                    : undefined,
            },
            {
                label: 'Valuation',
                value: overviewLoading ? 'Loading' : overview ? formatCurrency(Number(overview.valuation?.current ?? 0), { maximumFractionDigits: 0 }) : 'Not connected',
                // valuation.multiple is a revenue multiple (e.g. 5.2×), not a percentage delta.
                trend: hasOverview && Number.isFinite(valMultiple)
                    ? { value: `${formatNumber(valMultiple, 1)}×`, positive: (valMultiple ?? 0) >= 1 }
                    : undefined,
            },
            {
                label: 'Role',
                value: currentApp ? appRole.replace('_', ' ') : 'Unknown',
            },
        ];

        return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((stat) => (
                    <StatTile key={stat.label} label={stat.label} value={stat.value} trend={stat.trend} className="capitalize" />
                ))}
                {overviewError && (
                    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm font-semibold text-warning sm:col-span-2 lg:col-span-4">
                        Analytics are not connected for this app yet. {overviewError}
                    </div>
                )}
            </div>
        );
    };

    const renderSetupChecklist = () => showSetupChecklist ? (
        <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/10 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Continue setup</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Only unfinished setup items for this persisted app are shown.</p>
                </div>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-white/10 dark:text-amber-200">
                    {setupChecklist.filter((item) => item.complete).length}/{setupChecklist.length}
                </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                {setupChecklist.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className={`h-5 w-5 ${item.complete ? 'text-success' : 'text-muted-foreground/40'}`} />
                            <span className="text-sm font-bold text-foreground">{item.label}</span>
                        </div>
                        {!item.complete && item.path && (
                            <Link to={item.path} className="text-xs font-bold text-primary hover:underline">Open</Link>
                        )}
                        {!item.complete && item.onClick && (
                            <button type="button" onClick={item.onClick} disabled={initializing} className="text-xs font-bold text-primary hover:underline disabled:opacity-50">
                                {initializing ? 'Starting' : item.action}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    ) : null;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
                    <LoadingState
                        title="Loading dashboard..."
                        description="Fetching your app workspace and development progress."
                        className="border-0 bg-transparent shadow-none"
                    />
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto py-12 px-4 space-y-6">
                    <ErrorState
                        title="Development Progress Unavailable"
                        description={`${error} You can still manage the app, invite co-founders, prepare ownership records, or start a funding draft.`}
                        action={{ label: 'Retry Progress', onClick: loadProgress }}
                    />
                    {renderCoreActions()}
                </div>
            </DashboardLayout>
        );
    }

    if (!progress) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-12 px-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-semibold transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Apps
                    </button>

                    <div className="space-y-6">
                        <div className="rounded-[2rem] border border-border bg-card p-8">
                            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-primary">{currentApp?.app_category || 'App workspace'}</p>
                                    <h1 className="mt-2 text-3xl font-extrabold text-foreground">{currentApp?.app_name || 'App dashboard'}</h1>
                                    <p className="mt-2 text-sm text-muted-foreground">{currentApp?.app_status || 'development'} / {appRole.replace('_', ' ')}</p>
                                </div>
                            </div>
                            {renderOverviewCards()}
                        </div>
                        {renderSetupChecklist()}
                        <AppLifecycleTracker
                            appName={currentApp?.app_name}
                            progress={progress}
                            error={progressError}
                            canManage={canManage}
                            isInitializing={initializing}
                            onInitialize={handleInitialize}
                        />
                        {renderCoreActions()}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const currentPhase = getCurrentPhase();

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm font-semibold transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Apps
                </button>

                {/* Hero Header */}
                <div className="bg-card rounded-[2rem] border border-border overflow-hidden mb-6">
                    <div className="p-8 sm:p-10 bg-gradient-to-br from-accent/5 via-transparent to-transparent relative">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 relative z-10">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                                    {currentApp?.app_name || 'Development Dashboard'}
                                </h1>
                                <p className="text-muted-foreground mt-3 text-lg">
                                    {currentApp?.app_category || 'App'} / {currentApp?.app_status || 'development'} / {appRole.replace('_', ' ')}
                                </p>
                                {currentPhase && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <span className="text-sm font-semibold text-muted-foreground">Active Phase:</span>
                                        <span
                                            onClick={() => navigate(`/apps/${id}/phases/${currentPhase.id}`)}
                                            className="text-sm font-bold text-accent cursor-pointer hover:underline flex items-center gap-1"
                                        >
                                            {currentPhase.name}
                                            <ChevronRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3 lg:justify-end">
                                <button
                                    type="button"
                                    onClick={() => refetchOverview()}
                                    disabled={overviewLoading}
                                    className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground ring-1 ring-border transition hover:text-foreground disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
                                    {overviewLoading ? 'Refreshing' : 'Refresh'}
                                </button>
                                {canManage && (
                                    <Link
                                        to={`/apps/${id}/team`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-primary/15 transition hover:bg-primary/10"
                                    >
                                        <Users className="h-4 w-4" />
                                        Invite co-founder
                                    </Link>
                                )}
                                {canFundraise && (
                                    <Link
                                        to={`/campaigns/new?appId=${id}`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                                    >
                                        <Rocket className="h-4 w-4" />
                                        Raise funding
                                    </Link>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:min-w-[420px]">
                                    {[
                                    { label: 'Overall', value: `${progress.overallProgress ?? 0}%`, accent: true },
                                    { label: 'Milestones', value: `${progress.completedMilestones ?? 0}/${progress.totalMilestones ?? 0}` },
                                    { label: 'MRR', value: overview ? formatCurrency(Number(overview.mrr?.value ?? 0), { maximumFractionDigits: 0 }) : 'Not connected' },
                                    { label: 'Team', value: progress.team?.length ?? 0 },
                                ].map((stat) => (
                                    <div key={stat.label} className={`p-4 rounded-2xl border text-center ${stat.accent ? 'bg-accent/5 border-accent/20' : 'bg-muted/30 border-border/50'}`}>
                                        <p className={`text-2xl font-black ${stat.accent ? 'text-accent' : 'text-foreground'}`}>{stat.value}</p>
                                        <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-8 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Development Progress</span>
                                <span className="text-xs font-bold text-muted-foreground">{progress.completedMilestones}/{progress.totalMilestones} milestones</span>
                            </div>
                            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress.overallProgress ?? 0}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-accent via-accent/90 to-emerald-400 rounded-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div role="tablist" aria-label="App workspace sections" className="flex border-t border-border overflow-x-auto">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const selected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    id={`tab-${tab.id}`}
                                    role="tab"
                                    aria-selected={selected}
                                    aria-controls={`tabpanel-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected
                                            ? 'border-accent text-accent bg-accent/5'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" aria-hidden="true" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        id={`tabpanel-${activeTab}`}
                        role="tabpanel"
                        aria-labelledby={`tab-${activeTab}`}
                        tabIndex={0}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="focus-visible:outline-none"
                    >
                        {/* OVERVIEW */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {renderOverviewCards()}
                                {renderSetupChecklist()}
                                {renderCoreActions()}
                                <AppLifecycleTracker
                                    appName={currentApp?.app_name}
                                    progress={progress}
                                    canManage={canManage}
                                    isInitializing={initializing}
                                    onInitialize={handleInitialize}
                                />

                                {/* Phase Timeline */}
                                {progress.phases?.length > 0 && <div className="bg-card rounded-[2rem] border border-border p-8">
                                    <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Phase Timeline</h3>
                                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                        {progress.phases?.map((phase: DevelopmentPhase, index: number) => {
                                            const isActive = phase.status === 'in_progress';
                                            const isCompleted = phase.status === 'completed';
                                            return (
                                                <div key={phase.id} className="flex items-center shrink-0">
                                                    <div
                                                        onClick={() => navigate(`/apps/${id}/phases/${phase.id}`)}
                                                        className={`flex flex-col items-center p-5 rounded-2xl cursor-pointer transition-all min-w-[130px] border ${isActive
                                                                ? 'bg-accent/5 border-accent ring-4 ring-accent/10'
                                                                : isCompleted
                                                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                                                    : 'bg-muted/30 border-border hover:bg-muted/50'
                                                            }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isCompleted ? 'bg-emerald-500 text-white' :
                                                                isActive ? 'bg-accent text-white' :
                                                                    'bg-muted text-muted-foreground'
                                                            }`}>
                                                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : phase.phaseNumber}
                                                        </div>
                                                        <p className={`text-sm font-bold mt-3 text-center ${isActive ? 'text-accent' : 'text-foreground'}`}>{phase.name}</p>
                                                        <p className="text-xs text-muted-foreground font-semibold mt-1">{phase.completionPct ?? 0}%</p>
                                                    </div>
                                                    {index < progress.phases.length - 1 && (
                                                        <ChevronRight className="w-5 h-5 text-muted-foreground mx-2 shrink-0" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>}

                                {/* Recent Deployments */}
                                {progress.deployments?.length > 0 && (
                                    <div className="bg-card rounded-[2rem] border border-border p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent Deployments</h3>
                                            <button onClick={() => setActiveTab('deployments')} className="text-sm text-accent font-bold hover:underline">
                                                View All
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {progress.deployments.slice(0, 4).map((dep: DeploymentRecord) => {
                                                const status = DEPLOYMENT_STATUS_CONFIG[dep.status] ?? DEPLOYMENT_STATUS_CONFIG.preparing;
                                                const platform = PLATFORM_CONFIG[dep.platform] ?? { label: dep.platform, icon: '📦' };
                                                return (
                                                    <div key={dep.id} className="p-4 bg-muted/30 rounded-2xl border border-border/50 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">{platform.icon}</span>
                                                            <div>
                                                                <p className="font-bold text-foreground">{platform.label}</p>
                                                                <p className="text-xs text-muted-foreground font-medium">v{dep.version} · Build {dep.buildNumber}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PHASES */}
                        {activeTab === 'phases' && (
                            <div className="bg-card rounded-[2rem] border border-border p-8">
                                <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">All Phases</h3>
                                <div className="space-y-4">
                                    {progress.phases?.map((phase: DevelopmentPhase) => {
                                        const status = PHASE_STATUS_CONFIG[phase.status] ?? PHASE_STATUS_CONFIG.not_started;
                                        const completedMilestones = phase.milestones?.filter((m: any) => m.status === 'completed').length || 0;
                                        const total = phase.milestones?.length || 0;
                                        const phasePct = total > 0 ? Math.round((completedMilestones / total) * 100) : 0;
                                        return (
                                            <div
                                                key={phase.id}
                                                onClick={() => navigate(`/apps/${id}/phases/${phase.id}`)}
                                                className="p-5 bg-muted/20 rounded-2xl border border-border/50 cursor-pointer hover:bg-muted/40 hover:border-accent/30 transition-all group"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${phase.status === 'completed' ? 'bg-emerald-500 text-white' :
                                                                phase.status === 'in_progress' ? 'bg-accent text-white' :
                                                                    'bg-muted text-muted-foreground'
                                                            }`}>
                                                            {phase.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : phase.phaseNumber}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-foreground text-lg">{phase.name}</p>
                                                            {phase.description && (
                                                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{phase.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{completedMilestones}/{total} milestones</p>
                                                            <div className="w-24 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                                                                <div className="h-full bg-accent rounded-full" style={{ width: `${phasePct}%` }} />
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* DEPLOYMENTS */}
                        {activeTab === 'deployments' && (
                            <div className="bg-card rounded-[2rem] border border-border p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Deployment Records</h3>
                                    <Link
                                        to={`/apps/${id}/deployments/new`}
                                        className="px-5 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 text-sm font-bold flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Deployment
                                    </Link>
                                </div>

                                {!progress.deployments?.length ? (
                                    <EmptyState
                                        icon={Rocket}
                                        title="No deployments yet"
                                        description="Record your first release to start tracking it here."
                                        action={{ label: 'New Deployment', href: `/apps/${id}/deployments/new`, icon: Plus }}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {progress.deployments.map((dep: DeploymentRecord) => {
                                            const status = DEPLOYMENT_STATUS_CONFIG[dep.status] ?? DEPLOYMENT_STATUS_CONFIG.preparing;
                                            const platform = PLATFORM_CONFIG[dep.platform] ?? { label: dep.platform, icon: '📦' };
                                            return (
                                                <div key={dep.id} className="p-5 bg-muted/20 rounded-2xl border border-border/50">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-3xl">{platform.icon}</span>
                                                            <div>
                                                                <p className="font-bold text-foreground text-lg">{platform.label} — v{dep.version}</p>
                                                                <p className="text-sm text-muted-foreground font-medium">Build #{dep.buildNumber}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${status.color}`}>
                                                                <span className={`w-2 h-2 rounded-full ${status.dot} ${dep.status === 'live' ? 'animate-pulse' : ''}`} />
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {dep.storeUrl && validateUrl(dep.storeUrl) && (
                                                        <a
                                                            href={dep.storeUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-accent hover:underline mt-3 inline-flex items-center gap-1 font-semibold"
                                                        >
                                                            View in Store →
                                                        </a>
                                                    )}
                                                    {dep.notes && (
                                                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t border-border/50 pt-3">{dep.notes}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TEAM */}
                        {activeTab === 'team' && (
                            <div className="bg-card rounded-[2rem] border border-border p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Team Members</h3>
                                    <Button onClick={() => setShowAddTeamModal(true)} className="">
                                        <Plus className="w-4 h-4" aria-hidden="true" />
                                        Add Member
                                    </Button>
                                </div>

                                {!progress.team?.length ? (
                                    <EmptyState
                                        icon={Users}
                                        title="No team members yet"
                                        description="Invite collaborators to build your app with you."
                                        action={{ label: 'Add Member', onClick: () => setShowAddTeamModal(true), icon: Plus }}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {progress.team.map((member: any) => (
                                            <div key={member.id} className="p-5 bg-muted/20 rounded-2xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center text-white font-black text-lg">
                                                        {member.user?.fullName?.[0] || member.user?.email?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground text-lg">{member.user?.fullName || member.user?.email}</p>
                                                        <p className="text-sm text-muted-foreground capitalize font-medium">{member.role.replace(/_/g, ' ')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {member.canUpdateProgress && (
                                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-xs font-bold">Can Update</span>
                                                    )}
                                                    {member.canPostUpdates && (
                                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-lg text-xs font-bold">Can Post</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* UPDATES */}
                        {activeTab === 'updates' && (
                            <div className="bg-card rounded-[2rem] border border-border p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Progress Updates</h3>
                                    <Button onClick={() => setShowPostUpdateModal(true)} className="">
                                        <Plus className="w-4 h-4" aria-hidden="true" />
                                        Post Update
                                    </Button>
                                </div>

                                {!progress.updates?.length ? (
                                    <EmptyState
                                        icon={FileText}
                                        title="No updates posted yet"
                                        description="Share milestones and announcements with your team."
                                        action={{ label: 'Post Update', onClick: () => setShowPostUpdateModal(true), icon: Plus }}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {progress.updates.map((update: ProgressUpdate) => (
                                            <div key={update.id} className="p-5 bg-muted/20 rounded-2xl border border-border/50">
                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                    <p className="font-bold text-foreground text-lg">{update.title}</p>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className="text-xs text-muted-foreground font-medium capitalize px-2 py-1 bg-muted rounded-lg">{update.visibility}</span>
                                                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(update.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{update.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                <PostUpdateModal
                    appId={id || ''}
                    isOpen={showPostUpdateModal}
                    onClose={() => setShowPostUpdateModal(false)}
                    onSuccess={loadProgress}
                    phases={progress?.phases?.map((p: DevelopmentPhase) => ({ id: p.id, name: p.name }))}
                />

                <AddTeamMemberModal
                    appId={id || ''}
                    isOpen={showAddTeamModal}
                    onClose={() => setShowAddTeamModal(false)}
                    onSuccess={loadProgress}
                />
            </div>
        </DashboardLayout>
    );
};
