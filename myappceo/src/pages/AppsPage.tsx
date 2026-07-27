import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    ArrowUpRight,
    Briefcase,
    Crown,
    Eye,
    FolderKanban,
    PieChart,
    Plus,
    Search,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    flattenUserApps,
    groupUserAppsByRole,
    useUserApps,
    UserAppMembership,
    UserAppRole,
    UserAppSetupCompleteness,
} from '../hooks/useUserApps';

const roleConfig: Record<UserAppRole, { label: string; icon: React.ElementType; tone: string }> = {
    owner: { label: 'Owner', icon: Crown, tone: 'text-amber-600 bg-amber-500/10' },
    cofounder: { label: 'Co-founder', icon: Users, tone: 'text-blue-600 bg-blue-500/10' },
    shareholder: { label: 'Shareholder', icon: Briefcase, tone: 'text-emerald-600 bg-emerald-500/10' },
    prospective: { label: 'Watch-only', icon: Eye, tone: 'text-violet-600 bg-violet-500/10' },
    watch_only: { label: 'Watch-only', icon: Eye, tone: 'text-slate-600 bg-slate-500/10' },
};

const groups = [
    { key: 'owned', title: 'Owner apps', empty: 'No owned apps match these filters.' },
    { key: 'cofounded', title: 'Co-founder apps', empty: 'No co-founder apps match these filters.' },
    { key: 'shareholder', title: 'Shareholder apps', empty: 'No shareholder apps match these filters.' },
    { key: 'watchOnly', title: 'Watch-only apps', empty: 'No watch-only apps match these filters.' },
] as const;

export const AppsPage: React.FC = () => {
    const { getMyApps, isLoading, error } = useUserApps();
    const [apps, setApps] = useState<UserAppMembership[]>([]);
    const [roleFilter, setRoleFilter] = useState<UserAppRole | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [setupFilter, setSetupFilter] = useState<UserAppSetupCompleteness | 'all'>('all');
    const [query, setQuery] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadApps = async () => {
            const result = await getMyApps();
            if (!mounted) return;
            setApps(result.success && result.data ? flattenUserApps(result.data) : []);
        };

        loadApps();

        return () => {
            mounted = false;
        };
    }, [getMyApps]);

    const filterOptions = useMemo(() => {
        const statuses = Array.from(new Set(apps.map((app) => app.app_status).filter(Boolean))).sort();
        const categories = Array.from(new Set(apps.map((app) => app.app_category).filter(Boolean))).sort();
        return { statuses, categories };
    }, [apps]);

    const filteredApps = useMemo(() => apps.filter((app) => {
        const matchesRole = roleFilter === 'all' || app.role === roleFilter || (roleFilter === 'watch_only' && app.role === 'prospective');
        const matchesStatus = statusFilter === 'all' || app.app_status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || app.app_category === categoryFilter;
        const matchesSetup = setupFilter === 'all' || (app.setup_completeness || 'unknown') === setupFilter;
        const text = `${app.app_name} ${app.app_category} ${app.app_status}`.toLowerCase();
        const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
        return matchesRole && matchesStatus && matchesCategory && matchesSetup && matchesQuery;
    }), [apps, categoryFilter, query, roleFilter, setupFilter, statusFilter]);

    const groupedApps = useMemo(() => groupUserAppsByRole(filteredApps), [filteredApps]);

    const stats = useMemo(() => {
        const owned = apps.filter((app) => app.role === 'owner').length;
        const cofounded = apps.filter((app) => app.role === 'cofounder').length;
        const shareholder = apps.filter((app) => app.role === 'shareholder').length;
        const incomplete = apps.filter((app) => app.setup_completeness === 'incomplete' || app.setup_complete === false).length;
        return [
            { title: 'Managed Apps', value: apps.length.toString(), subtitle: `${owned} owned`, icon: FolderKanban },
            { title: 'Active Roles', value: `${owned + cofounded + shareholder}`, subtitle: 'Owner, co-founder, shareholder', icon: Users },
            { title: 'Setup Needed', value: `${incomplete}`, subtitle: 'Real incomplete workspaces', icon: ShieldCheck },
        ];
    }, [apps]);

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">My Apps</h1>
                        <p className="mt-1 font-medium text-muted-foreground">Canonical workspace for apps you own, help build, hold shares in, or watch.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/campaigns" className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-muted/80">
                            <PieChart size={18} /> Browse Campaigns
                        </Link>
                        <Link to="/apps/new" className="flex items-center gap-2 rounded-xl bg-[#0071e3] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0077ed]">
                            <Plus size={18} /> Add App
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {stats.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.title} className="rounded-2xl bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] dark:bg-[#1e1e20]">
                                <div className="mb-5 flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1d1d1f]/42 dark:text-white/42">{card.title}</p>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#0071e3]">
                                        <Icon size={19} />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-[#1d1d1f] dark:text-white">{card.value}</p>
                                <p className="mt-1 text-sm text-[#1d1d1f]/50 dark:text-white/50">{card.subtitle}</p>
                            </div>
                        );
                    })}
                </div>

                <section className="rounded-2xl bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] dark:bg-[#1e1e20]">
                    <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
                        <label className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search apps"
                                className="h-11 w-full rounded-xl bg-muted/70 pl-10 pr-3 text-sm font-medium outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-[#0071e3]/25 dark:focus:bg-white/10"
                            />
                        </label>
                        <FilterSelect label="Role" value={roleFilter} onChange={(value) => setRoleFilter(value as UserAppRole | 'all')}>
                            <option value="all">All roles</option>
                            <option value="owner">Owner</option>
                            <option value="cofounder">Co-founder</option>
                            <option value="shareholder">Shareholder</option>
                            <option value="watch_only">Watch-only</option>
                        </FilterSelect>
                        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
                            <option value="all">All statuses</option>
                            {filterOptions.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </FilterSelect>
                        <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter}>
                            <option value="all">All categories</option>
                            {filterOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </FilterSelect>
                        <FilterSelect label="Setup" value={setupFilter} onChange={(value) => setSetupFilter(value as UserAppSetupCompleteness | 'all')}>
                            <option value="all">Any setup</option>
                            <option value="complete">Complete</option>
                            <option value="incomplete">Incomplete</option>
                            <option value="unknown">Unknown</option>
                        </FilterSelect>
                    </div>
                </section>

                {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="grid gap-3">
                        {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
                    </div>
                ) : apps.length === 0 ? (
                    <EmptyState title="No apps in your workspace yet" body="Add an existing app to create a persisted workspace for ownership, legal setup, campaigns, and operations." cta="Add your first app" />
                ) : filteredApps.length === 0 ? (
                    <EmptyState title="No apps match these filters" body="Clear a filter or search term to see more of your managed apps." />
                ) : (
                    <div className="space-y-8">
                        {groups.map((group) => (
                            <AppGroup
                                key={group.key}
                                title={group.title}
                                empty={group.empty}
                                apps={groupedApps[group.key]}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

interface FilterSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, children }) => (
    <label>
        <span className="sr-only">{label}</span>
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full rounded-xl bg-muted/70 px-3 text-sm font-semibold capitalize text-foreground outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-[#0071e3]/25 dark:focus:bg-white/10"
        >
            {children}
        </select>
    </label>
);

const EmptyState: React.FC<{ title: string; body: string; cta?: string }> = ({ title, body, cta }) => (
    <div className="rounded-2xl bg-white p-10 text-center shadow-[0_14px_36px_rgba(15,23,42,0.07)] dark:bg-[#1e1e20]">
        <FolderKanban className="mx-auto mb-4 h-10 w-10 text-[#0071e3]" />
        <p className="text-base font-bold text-[#1d1d1f] dark:text-white">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#1d1d1f]/52 dark:text-white/52">{body}</p>
        {cta && <Link to="/apps/new" className="mt-5 inline-flex rounded-xl bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white">{cta}</Link>}
    </div>
);

const AppGroup: React.FC<{ title: string; empty: string; apps: UserAppMembership[] }> = ({ title, empty, apps }) => {
    if (!apps.length) {
        return (
            <section className="space-y-3">
                <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white">{title}</h3>
                <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm font-medium text-muted-foreground">{empty}</div>
            </section>
        );
    }

    return (
        <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white">{title}</h3>
            <div className="grid grid-cols-1 gap-3">
                {apps.map((app) => <AppRow key={`${app.role}-${app.app_id}`} app={app} />)}
            </div>
        </section>
    );
};

const AppRow: React.FC<{ app: UserAppMembership }> = ({ app }) => {
    const config = roleConfig[app.role] || roleConfig.watch_only;
    const Icon = config.icon;
    const setupLabel = app.setup_completeness === 'incomplete' ? 'Setup incomplete' : app.setup_completeness === 'complete' ? 'Setup complete' : 'Setup unknown';

    return (
        <Link
            to={`/apps/${app.app_id}/dashboard`}
            className="group flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition-all hover:bg-[#f8fafc] dark:bg-[#1e1e20] dark:hover:bg-[#242427] md:flex-row md:items-center md:justify-between"
        >
            <div className="flex min-w-0 items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${config.tone}`}>
                    {app.app_image_url ? <img src={app.app_image_url} alt="" className="h-full w-full rounded-2xl object-cover" /> : <Icon size={22} />}
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-lg font-bold text-foreground">{app.app_name}</h4>
                        <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-xs font-medium text-[#0071e3]">{config.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {app.app_category || 'App'} / {app.app_status || 'development'} / {setupLabel}
                    </p>
                </div>
            </div>
            <div className="flex w-full items-center gap-6 md:w-auto">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Equity</p>
                    <p className="text-sm font-bold text-foreground">{Number(app.equity_pct || 0).toFixed(1)}%</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shares</p>
                    <p className="text-sm font-bold text-foreground">{Number(app.shares_owned || 0).toLocaleString()}</p>
                </div>
                <span className="ml-auto rounded-xl bg-muted p-3 text-muted-foreground transition-all group-hover:bg-[#e8f2ff] group-hover:text-[#0071e3]">
                    <ArrowUpRight size={20} />
                </span>
            </div>
        </Link>
    );
};
