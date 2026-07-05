import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Link } from 'react-router-dom';
import {
    Wallet,
    TrendingUp,
    ArrowRight,
    Bell,
    Layers,
    PieChart as PieChartIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell } from 'recharts';
import { useDevelopment, InvestorNotification } from '../hooks/useDevelopment';
import { useCrowdfunding, InvestmentCommitment, CrowdfundingCampaign } from '../hooks/useCrowdfundingSupabase';
import {
    StatTile,
    StatusBadge,
    ProgressBar,
    EmptyState,
    ErrorState,
    Card,
    CardHeader,
    CardTitle,
    ChartCard,
    ThemedTooltip,
    BreakdownList,
    Skeleton,
    seriesColor,
} from '../components/ui';
import type { BreakdownDatum } from '../components/ui';
import { formatCurrency, formatPercent, formatDate, clampPercent } from '../utils/format';

interface InvestmentWithCampaign {
    commitment: InvestmentCommitment;
    campaign: CrowdfundingCampaign;
}

export const InvestorPortfolioPage: React.FC = () => {
    const [investments, setInvestments] = useState<InvestmentWithCampaign[]>([]);
    const [notifications, setNotifications] = useState<InvestorNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { getNotifications, markNotificationRead, markAllNotificationsRead } = useDevelopment();
    const { getMyInvestments } = useCrowdfunding();

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [investmentsResult, notifsResult] = await Promise.all([
                getMyInvestments(),
                getNotifications(10),
            ]);

            if (investmentsResult.success && investmentsResult.data) {
                setInvestments((investmentsResult.data as any).data || investmentsResult.data);
            } else if ((investmentsResult as any).error) {
                throw new Error((investmentsResult as any).error);
            }
            if (notifsResult.success && notifsResult.data) {
                setNotifications((notifsResult.data as any).data || notifsResult.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'We could not load your portfolio.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkRead = async (notificationId: string) => {
        await markNotificationRead(notificationId);
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.commitment?.amount || 0), 0);
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Allocation of invested capital per holding — the portfolio visualization.
    const allocations = useMemo<BreakdownDatum[]>(
        () =>
            investments
                .filter((inv) => (inv.commitment?.amount || 0) > 0)
                .map((inv, idx) => ({
                    label: inv.campaign?.title || 'Untitled campaign',
                    value: inv.commitment.amount,
                    colorIndex: idx,
                }))
                .sort((a, b) => b.value - a.value),
        [investments],
    );

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Investor Portfolio</h1>
                        <p className="text-muted-foreground mt-1">Track your investments and allocation</p>
                    </div>
                    <Link
                        to="/invest"
                        className="px-5 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 inline-flex items-center gap-2 font-semibold text-sm shrink-0"
                    >
                        <TrendingUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Browse More</span>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-2xl" />
                            ))}
                        </div>
                        <Skeleton className="h-72 rounded-2xl" />
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-40 rounded-2xl" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Couldn't load your portfolio"
                        description="Something went wrong while fetching your investments and updates."
                        detail={error}
                        action={{ label: 'Try again', onClick: loadData }}
                        secondaryAction={{ label: 'Browse campaigns', href: '/invest' }}
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <StatTile label="Total Invested" value={formatCurrency(totalInvested)} icon={Wallet} />
                            <StatTile label="Holdings" value={investments.length} icon={Layers} />
                            <StatTile label="Unread Alerts" value={unreadCount} icon={Bell} />
                        </div>

                        {allocations.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <ChartCard
                                    title={
                                        <span className="flex items-center gap-2">
                                            <PieChartIcon className="w-4 h-4 text-accent" /> Portfolio Allocation
                                        </span>
                                    }
                                    description="Invested capital per holding"
                                    height={240}
                                >
                                    <PieChart>
                                        <Pie
                                            data={allocations}
                                            dataKey="value"
                                            nameKey="label"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={2}
                                            stroke="none"
                                        >
                                            {allocations.map((entry, index) => (
                                                <Cell key={entry.label} fill={seriesColor(entry.colorIndex ?? index)} />
                                            ))}
                                        </Pie>
                                        <ThemedTooltip
                                            valueFormatter={(v) => formatCurrency(Number(v))}
                                            cursor={false}
                                        />
                                    </PieChart>
                                </ChartCard>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Breakdown</CardTitle>
                                    </CardHeader>
                                    <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                                        <BreakdownList
                                            items={allocations}
                                            valueFormatter={(v) => formatCurrency(v)}
                                            total={totalInvested}
                                            totalLabel="Total invested"
                                        />
                                    </div>
                                </Card>
                            </div>
                        )}

                        {notifications.length > 0 && (
                            <div className="bg-card rounded-2xl border border-border p-6 mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-accent" />
                                        <h3 className="font-bold text-foreground">Recent Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 bg-error text-white rounded-full text-xs font-bold">{unreadCount}</span>
                                        )}
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-sm text-accent hover:text-accent/80 font-medium"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {notifications.slice(0, 5).map((notification) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            onClick={() => handleMarkRead(notification.id)}
                                            className={`w-full text-left p-3 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                                                notification.read ? 'bg-muted/30' : 'bg-accent/5 hover:bg-accent/10'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="font-medium text-foreground text-sm">{notification.title}</p>
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {formatDate(notification.createdAt)}
                                                </span>
                                            </div>
                                            {notification.content && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{notification.content}</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {investments.length === 0 ? (
                            <EmptyState
                                icon={Wallet}
                                title="No investments yet"
                                description="Start investing in campaigns to build your portfolio and track app development."
                                action={{ label: 'Browse Campaigns', href: '/invest', icon: TrendingUp }}
                            />
                        ) : (
                            <div className="space-y-4">
                                <h3 className="font-bold text-foreground">Your Investments</h3>
                                {investments.map((investment, index) => {
                                    const { commitment, campaign } = investment;
                                    const funded = clampPercent(campaign?.fundingRaised, campaign?.fundingGoal);

                                    return (
                                        <motion.div
                                            key={commitment.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-card rounded-2xl border border-border p-6 hover:border-accent/30 hover:shadow-lg transition-all group"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <StatusBadge kind="campaign" status={campaign?.status} size="sm" dot />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-foreground truncate">
                                                        <Link
                                                            to={`/campaigns/${campaign?.id || commitment.campaignId}`}
                                                            className="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                                                        >
                                                            {campaign?.title || 'App Investment'}
                                                        </Link>
                                                    </h3>

                                                    <div className="flex items-center gap-6 mt-4">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Invested</p>
                                                            <p className="text-lg font-bold text-foreground">{formatCurrency(commitment.amount)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Your Stake</p>
                                                            <p className="text-lg font-bold text-accent">{formatPercent(commitment.stakePct, { maximumFractionDigits: 2 })}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Campaign Funded</p>
                                                            <p className="text-lg font-bold text-foreground">{Math.round(funded)}%</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4">
                                                        <ProgressBar value={funded} tone="primary" label={`Campaign funding: ${Math.round(funded)}%`} />
                                                    </div>
                                                </div>

                                                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-2 md:min-w-[140px]">
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Valuation</p>
                                                        <p className="text-sm font-medium text-foreground">{formatCurrency(commitment.valuationAtCommitment)}</p>
                                                    </div>
                                                    <Link
                                                        to={`/campaigns/${campaign?.id || commitment.campaignId}`}
                                                        className="text-sm text-accent font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                                                    >
                                                        View Details <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};
