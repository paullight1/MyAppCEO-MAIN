import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
    BarChart3, 
    DollarSign, 
    TrendingUp, 
    Eye, 
    Download, 
    Calendar,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { usePromotionAnalytics } from '../hooks/usePromotionAnalytics';
import { MetricCard } from '../components/MetricCard';
import { PerformanceChart } from '../components/PerformanceChart';
import { CampaignPerformanceTable } from '../components/CampaignPerformanceTable';
import { CreatorLeaderboard } from '../components/CreatorLeaderboard';
import { AppPerformanceTable } from '../components/AppPerformanceTable';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import { downloadCsv, type CsvColumn } from '../utils/exportCsv';
import type { CampaignMetrics } from '../hooks/usePromotionAnalytics';

export const PromotionAnalyticsPage: React.FC = () => {
    const { 
        overview, 
        campaignMetrics, 
        creatorPerformance, 
        appMetrics, 
        timeseriesData,
        isLoading,
        error,
        refetchAll,
        setDateRangeFilter,
        dateRange,
        pauseCampaign,
        resumeCampaign,
        archiveCampaign,
    } = usePromotionAnalytics();
    const [liveFetchCompleted, setLiveFetchCompleted] = useState(false);

    useEffect(() => {
        let isMounted = true;

        refetchAll().finally(() => {
            if (isMounted) {
                setLiveFetchCompleted(true);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [refetchAll]);

    const displayOverview = overview;
    const displayCampaignMetrics = campaignMetrics;
    const displayCreatorPerformance = creatorPerformance;
    const displayAppMetrics = appMetrics;
    const displayTimeseriesData = timeseriesData;

    const statCards = [
        { label: 'Total Spent', value: displayOverview ? `$${displayOverview.totalSpent.toLocaleString()}` : '-', icon: DollarSign, gradient: 'blue' as const },
        { label: 'Total Reach', value: displayOverview ? displayOverview.totalReach.toLocaleString() : '-', icon: Eye, gradient: 'purple' as const },
        { label: 'Conversion Rate', value: displayOverview ? `${displayOverview.conversionRate}%` : '-', icon: TrendingUp, gradient: 'green' as const },
        { label: 'Avg ROI', value: displayOverview ? `${displayOverview.roi}x` : '-', icon: BarChart3, gradient: 'amber' as const },
    ];

    const hasAnalyticsData = Boolean(displayOverview) || displayCampaignMetrics.length > 0 || displayCreatorPerformance.length > 0 || displayAppMetrics.length > 0 || displayTimeseriesData.length > 0;

    const handleExport = () => {
        if (displayCampaignMetrics.length === 0) return;
        const columns: CsvColumn<CampaignMetrics>[] = [
            { header: 'Campaign', accessor: (row) => row.campaignName },
            { header: 'App', accessor: (row) => row.appName },
            { header: 'Status', accessor: (row) => row.status },
            { header: 'Budget', accessor: (row) => row.budget },
            { header: 'Spent', accessor: (row) => row.spent },
            { header: 'Reach', accessor: (row) => row.reach },
            { header: 'Conversions', accessor: (row) => row.conversions },
            { header: 'Revenue', accessor: (row) => row.revenue },
            { header: 'ROI', accessor: (row) => row.roi },
        ];
        downloadCsv(`promotion-analytics-${dateRange.start}-to-${dateRange.end}.csv`, displayCampaignMetrics, columns);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center text-white">
                                <AnimatedIcon icon={BarChart3} size={20} animation="pulse" trigger="loop" />
                            </span>
                            Promotion Analytics
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1">Monitor your campaign performance and ROI</p>
                    </div>
                    <div className="flex gap-3">
                        <label className="px-4 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium flex items-center gap-2">
                            <Calendar size={18} />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(event) => {
                                    const next = { ...dateRange, start: event.target.value };
                                    setDateRangeFilter(next.start, next.end);
                                    refetchAll(next);
                                }}
                                className="bg-transparent text-sm outline-none"
                            />
                            <span>to</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(event) => {
                                    const next = { ...dateRange, end: event.target.value };
                                    setDateRangeFilter(next.start, next.end);
                                    refetchAll(next);
                                }}
                                className="bg-transparent text-sm outline-none"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={displayCampaignMetrics.length === 0}
                            className="group px-4 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <AnimatedIcon icon={Download} size={18} animation="float" /> Export
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold">Promotion analytics are not connected</p>
                                <p className="mt-1 text-xs leading-5">The page attempted to load live analytics, but the promotion analytics API is unavailable.</p>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading && !hasAnalyticsData && (
                    <div className="rounded-2xl border border-border bg-card p-4 text-sm font-medium text-muted-foreground flex items-center gap-3">
                        <Loader2 size={18} className="animate-spin text-accent" />
                        Loading promotion analytics...
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <MetricCard
                                key={stat.label}
                                title={stat.label}
                                value={stat.value}
                                icon={<Icon size={24} />}
                                gradient={stat.gradient}
                                footer={displayOverview ? undefined : 'Awaiting live data'}
                            />
                        );
                    })}
                </div>

                {/* Performance Charts */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-foreground mb-6">Performance Over Time</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <p className="text-sm text-muted-foreground mb-4">Spend vs Revenue</p>
                            <PerformanceChart data={displayTimeseriesData} type="spend-revenue" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-4">Reach Over Time</p>
                            <PerformanceChart data={displayTimeseriesData} type="reach" />
                        </div>
                    </div>
                    <div className="mt-8">
                        <p className="text-sm text-muted-foreground mb-4">Conversions</p>
                        <PerformanceChart data={displayTimeseriesData} type="conversions" />
                    </div>
                </div>

                {/* Campaign & Creator Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <CampaignPerformanceTable
                            campaigns={displayCampaignMetrics}
                            onPause={pauseCampaign}
                            onResume={resumeCampaign}
                            onArchive={archiveCampaign}
                        />
                    </div>
                    <div>
                        <CreatorLeaderboard creators={displayCreatorPerformance} />
                    </div>
                </div>

                {/* App Performance Table */}
                <AppPerformanceTable apps={displayAppMetrics} />
            </div>
        </DashboardLayout>
    );
};
