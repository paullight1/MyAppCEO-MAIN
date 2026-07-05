import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownRight, ArrowUpRight, DollarSign, Download, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { MetricCard } from '../components/MetricCard';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    ChartCard,
    BreakdownList,
    EmptyState,
    ErrorState,
    LoadingState,
    Select,
    chartTheme,
    seriesColor,
    ThemedTooltip,
} from '../components/ui';
import {
    formatCompactCurrency,
    formatCompactNumber,
    formatCurrency,
    formatNumber,
    formatPercent,
} from '../utils/format';
import { downloadCsv } from '../utils/exportCsv';
import { useDashboardData } from '../hooks/useDashboardData';
import { flattenUserApps, useUserApps, UserAppMembership } from '../hooks/useUserApps';

type RangeKey = '7d' | '30d' | '90d' | '12m';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '12m', label: 'Last 12 months' },
];

const RANGE_LABEL = (range: RangeKey): string =>
    RANGE_OPTIONS.find((o) => o.value === range)?.label ?? '';

/**
 * SAMPLE datasets. The overview endpoint (`/analytics/overview/:appId`) powers the
 * live metric tiles above, but there is no timeseries / cohort / acquisition
 * endpoint yet — so the charts below are illustrative sample data, clearly
 * labelled with a "Sample data" badge and never mixed into the live tiles.
 */
const ACTIVE_USERS: Record<RangeKey, { label: string; users: number }[]> = {
    '7d': [
        { label: 'Mon', users: 2100 }, { label: 'Tue', users: 2350 }, { label: 'Wed', users: 2420 },
        { label: 'Thu', users: 2180 }, { label: 'Fri', users: 2650 }, { label: 'Sat', users: 3100 }, { label: 'Sun', users: 2900 },
    ],
    '30d': [
        { label: 'W1', users: 15800 }, { label: 'W2', users: 16400 }, { label: 'W3', users: 17250 }, { label: 'W4', users: 18100 },
    ],
    '90d': [
        { label: 'Month 1', users: 52000 }, { label: 'Month 2', users: 58400 }, { label: 'Month 3', users: 63900 },
    ],
    '12m': [
        { label: 'Q1', users: 148000 }, { label: 'Q2', users: 172500 }, { label: 'Q3', users: 189200 }, { label: 'Q4', users: 214000 },
    ],
};

const RETENTION_COHORTS = [
    { week: 'Week 1', retention: 85 },
    { week: 'Week 2', retention: 65 },
    { week: 'Week 3', retention: 52 },
    { week: 'Week 4', retention: 42 },
    { week: 'Week 8', retention: 28 },
];

const ACQUISITION_SOURCES = [
    { label: 'Organic', value: 4523 },
    { label: 'Paid Ads', value: 2890 },
    { label: 'Referrals', value: 1423 },
    { label: 'Social', value: 892 },
    { label: 'Other', value: 506 },
];

const KEY_METRICS = [
    { label: 'Total Downloads', value: 15420, change: 22.3 },
    { label: 'Monthly Active Users', value: 8234, change: 8.5 },
    { label: 'New Signups', value: 652, change: 15.2 },
    { label: 'Avg. Session (min)', value: 4.5, change: -2.1, fractionDigits: 1 },
];

/** Small "not live" chip so sample sections are never misread as real data. */
const SampleBadge: React.FC = () => (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Sample data
    </span>
);

interface ExportRow {
    section: string;
    label: string;
    value: number | string;
    formatted: string;
}

export const AnalyticsPage: React.FC = () => {
    const { getMyApps } = useUserApps();

    const [apps, setApps] = useState<UserAppMembership[]>([]);
    const [appsLoading, setAppsLoading] = useState(true);
    const [appsError, setAppsError] = useState<string | null>(null);
    const [selectedAppId, setSelectedAppId] = useState<string>('');
    const [range, setRange] = useState<RangeKey>('7d');

    const loadApps = React.useCallback(async () => {
        setAppsLoading(true);
        setAppsError(null);
        try {
            const result = await getMyApps();
            if (result.success && result.data) {
                const flat = flattenUserApps(result.data).filter((a) => a.app_id);
                // De-duplicate — an app can surface under more than one role group.
                const unique = Array.from(new Map(flat.map((a) => [a.app_id, a])).values());
                setApps(unique);
                setSelectedAppId((prev) => (prev && unique.some((a) => a.app_id === prev) ? prev : unique[0]?.app_id ?? ''));
            } else {
                setApps([]);
                setAppsError(result.error ?? null);
            }
        } catch (err: any) {
            setApps([]);
            setAppsError(err?.message ?? 'Failed to load your apps');
        } finally {
            setAppsLoading(false);
        }
    }, [getMyApps]);

    useEffect(() => {
        loadApps();
    }, [loadApps]);

    const { data: overview, isLoading: overviewLoading, error: overviewError, refetch } = useDashboardData(
        selectedAppId || undefined,
    );

    const activeUsers = ACTIVE_USERS[range];
    const maxUsers = useMemo(
        () => (activeUsers.length ? Math.max(...activeUsers.map((d) => d.users)) : 0),
        [activeUsers],
    );

    const arpu = overview && overview.users.mau > 0 ? overview.mrr.value / overview.users.mau : null;
    const selectedApp = apps.find((a) => a.app_id === selectedAppId);

    const handleExport = () => {
        const rows: ExportRow[] = [];

        if (overview) {
            rows.push(
                { section: 'Overview (live)', label: 'MRR', value: overview.mrr.value, formatted: formatCurrency(overview.mrr.value) },
                { section: 'Overview (live)', label: 'MRR change', value: overview.mrr.change, formatted: formatPercent(overview.mrr.change, { signed: true }) },
                { section: 'Overview (live)', label: 'ARPU', value: arpu ?? '', formatted: formatCurrency(arpu) },
                { section: 'Overview (live)', label: 'Monthly active users', value: overview.users.mau, formatted: formatNumber(overview.users.mau) },
                { section: 'Overview (live)', label: 'Daily active users', value: overview.users.dau, formatted: formatNumber(overview.users.dau) },
                { section: 'Overview (live)', label: 'User growth', value: overview.users.growth, formatted: formatPercent(overview.users.growth, { signed: true }) },
                { section: 'Overview (live)', label: 'Valuation', value: overview.valuation.current, formatted: formatCurrency(overview.valuation.current) },
                { section: 'Overview (live)', label: 'Revenue multiple', value: overview.valuation.multiple, formatted: `${overview.valuation.multiple}x` },
            );
        }

        activeUsers.forEach((d) =>
            rows.push({ section: `Active users ${range} (sample)`, label: d.label, value: d.users, formatted: formatNumber(d.users) }));
        RETENTION_COHORTS.forEach((c) =>
            rows.push({ section: 'Retention cohorts (sample)', label: c.week, value: c.retention, formatted: formatPercent(c.retention) }));
        ACQUISITION_SOURCES.forEach((s) =>
            rows.push({ section: 'Acquisition sources (sample)', label: s.label, value: s.value, formatted: formatNumber(s.value) }));
        KEY_METRICS.forEach((m) =>
            rows.push({ section: 'Key metrics (sample)', label: m.label, value: m.value, formatted: formatNumber(m.value, m.fractionDigits ?? 0) }));

        downloadCsv(`analytics-${selectedApp?.app_name ?? 'export'}-${range}`, rows, [
            { header: 'Section', accessor: (r) => r.section },
            { header: 'Metric', accessor: (r) => r.label },
            { header: 'Value', accessor: (r) => r.value },
            { header: 'Formatted', accessor: (r) => r.formatted },
        ]);
    };

    const renderLiveMetrics = () => {
        if (appsLoading) {
            return <LoadingState title="Loading your apps" description="Fetching your portfolio…" />;
        }
        if (appsError) {
            return (
                <ErrorState
                    title="Couldn't load your apps"
                    description="We hit a problem fetching your portfolio."
                    detail={appsError}
                    action={{ label: 'Retry', onClick: loadApps }}
                />
            );
        }
        if (apps.length === 0) {
            return (
                <EmptyState
                    title="No apps to analyse yet"
                    description="Create or join an app to see its live revenue, users and valuation metrics here."
                />
            );
        }
        if (overviewLoading) {
            return <LoadingState variant="skeleton" rows={2} title="Loading analytics" />;
        }
        if (overviewError) {
            return (
                <ErrorState
                    title="Couldn't load analytics"
                    description="We couldn't fetch the overview for this app."
                    detail={overviewError}
                    action={{ label: 'Retry', onClick: () => refetch() }}
                />
            );
        }
        if (!overview) {
            return (
                <EmptyState
                    title="No analytics yet"
                    description="This app doesn't have any analytics data to show yet."
                />
            );
        }

        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="MRR"
                    value={formatCurrency(overview.mrr.value, { maximumFractionDigits: 0 })}
                    change={overview.mrr.change}
                    icon={<DollarSign size={24} />}
                    gradient="purple"
                />
                <MetricCard
                    title="Monthly Active Users"
                    value={formatCompactNumber(overview.users.mau)}
                    change={overview.users.growth}
                    icon={<Activity size={24} />}
                    gradient="blue"
                />
                <MetricCard
                    title="ARPU"
                    value={formatCurrency(arpu, { maximumFractionDigits: 2 })}
                    icon={<TrendingUp size={24} />}
                    gradient="green"
                    footer={`${formatNumber(overview.users.dau)} daily active users`}
                />
                <MetricCard
                    title="Valuation"
                    value={formatCompactCurrency(overview.valuation.current)}
                    icon={<DollarSign size={24} />}
                    gradient="rose"
                    footer={`${overview.valuation.multiple}× revenue multiple`}
                />
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
                        <p className="text-muted-foreground">Detailed insights into your app performance</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {apps.length > 0 && (
                            <Select
                                aria-label="App"
                                value={selectedAppId}
                                onValueChange={setSelectedAppId}
                                placeholder=""
                                size="sm"
                                fullWidth={false}
                                className="w-full sm:w-52"
                                options={apps.map((a) => ({ value: a.app_id, label: a.app_name }))}
                            />
                        )}
                        <Select
                            aria-label="Date range"
                            value={range}
                            onValueChange={(v) => setRange(v as RangeKey)}
                            placeholder=""
                            size="sm"
                            fullWidth={false}
                            className="w-full sm:w-44"
                            options={RANGE_OPTIONS}
                        />
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Live metric tiles — driven by the real /analytics/overview endpoint. */}
                {renderLiveMetrics()}

                {/* Sample product-insight sections (no live endpoint yet). */}
                <div className="flex items-center gap-3 pt-2">
                    <h2 className="text-lg font-semibold text-foreground">Product insights</h2>
                    <SampleBadge />
                    <p className="hidden text-sm text-muted-foreground sm:block">
                        Illustrative figures — live product analytics coming soon.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <ChartCard
                        title="Active Users"
                        description={RANGE_LABEL(range)}
                        action={<SampleBadge />}
                        height={240}
                        isEmpty={activeUsers.length === 0}
                        emptyLabel="No active-user data for this range."
                    >
                        <BarChart data={activeUsers} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                            <XAxis dataKey="label" stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactNumber(v)} width={44} />
                            <ThemedTooltip valueFormatter={(v) => `${formatNumber(Number(v))} users`} />
                            <Bar dataKey="users" name="Active users" radius={[6, 6, 0, 0]}>
                                {activeUsers.map((d, i) => (
                                    <Cell key={i} fill={seriesColor(0)} fillOpacity={maxUsers > 0 ? 0.55 + 0.45 * (d.users / maxUsers) : 0.7} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartCard>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                            <CardTitle className="text-base">Retention Cohorts</CardTitle>
                            <SampleBadge />
                        </CardHeader>
                        <CardContent>
                            <BreakdownList
                                items={RETENTION_COHORTS.map((c) => ({ label: c.week, value: c.retention, percentage: c.retention, colorIndex: 2 }))}
                                valueFormatter={(v) => formatPercent(v)}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                            <CardTitle className="text-base">Acquisition Sources</CardTitle>
                            <SampleBadge />
                        </CardHeader>
                        <CardContent>
                            <BreakdownList
                                items={ACQUISITION_SOURCES}
                                valueFormatter={(v) => `${formatNumber(v)} users`}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                            <CardTitle className="text-base">Key Metrics Summary</CardTitle>
                            <SampleBadge />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {KEY_METRICS.map((metric) => {
                                const positive = metric.change >= 0;
                                return (
                                    <div key={metric.label} className="flex items-center justify-between rounded-xl bg-muted/60 p-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{metric.label}</p>
                                            <p className="text-xl font-bold text-foreground">{formatNumber(metric.value, metric.fractionDigits ?? 0)}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 text-sm font-bold ${positive ? 'text-success' : 'text-error'}`}>
                                            {positive ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowDownRight size={16} aria-hidden="true" />}
                                            {formatPercent(Math.abs(metric.change))}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};
