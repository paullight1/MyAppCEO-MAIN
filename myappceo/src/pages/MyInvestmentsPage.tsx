import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Link } from 'react-router-dom';
import {
    Wallet,
    TrendingUp,
    Clock,
    CheckCircle2,
    ArrowRight,
    Layers,
    Hourglass,
    CreditCard,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCrowdfunding, InvestmentCommitment, CrowdfundingCampaign } from '../hooks/useCrowdfundingSupabase';
import { StatTile, StatusBadge, EmptyState, ErrorState, LoadingState, Skeleton } from '../components/ui';
import { StatusKind } from '../utils/statusConfig';
import { formatCurrency, formatPercent, formatDate } from '../utils/format';

interface InvestmentWithCampaign {
    commitment: InvestmentCommitment;
    campaign: CrowdfundingCampaign;
}

const PAID_STATUSES = ['paid', 'confirmed'];

/**
 * Map an investment commitment/payment status onto the shared <StatusBadge>
 * registry (there is no dedicated "commitment" kind, so we reuse the closest
 * semantic tint and override the label). Replaces the hand-rolled color maps.
 */
const paymentBadge = (status: string): { kind: StatusKind; status: string; label: string } => {
    switch (status) {
        case 'paid':
            return { kind: 'escrow', status: 'completed', label: 'Paid' };
        case 'confirmed':
            return { kind: 'escrow', status: 'funded', label: 'Confirmed' };
        case 'cancelled':
            return { kind: 'offer', status: 'rejected', label: 'Cancelled' };
        case 'refunded':
            return { kind: 'escrow', status: 'refunded', label: 'Refunded' };
        case 'pending':
        default:
            return { kind: 'offer', status: 'pending', label: 'Payment pending' };
    }
};

export const MyInvestmentsPage: React.FC = () => {
    const [investments, setInvestments] = useState<InvestmentWithCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { getMyInvestments } = useCrowdfunding();

    useEffect(() => {
        loadInvestments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadInvestments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getMyInvestments();
            if (result.success && result.data) {
                setInvestments((result.data as any).data || result.data);
            } else {
                setError((result as any).error || 'We could not load your investments.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'We could not load your investments.');
        } finally {
            setIsLoading(false);
        }
    };

    const totalInvested = investments
        .filter((inv) => PAID_STATUSES.includes(inv.commitment.status))
        .reduce((sum, inv) => sum + inv.commitment.amount, 0);
    const activeCount = investments.filter((inv) => inv.campaign.status === 'active').length;
    const pendingCount = investments.filter((inv) => inv.commitment.status === 'pending').length;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">My Investments</h1>
                        <p className="text-muted-foreground mt-1">
                            {isLoading
                                ? 'Loading…'
                                : investments.length === 0
                                    ? 'Start investing in campaigns'
                                    : `${investments.length} investment${investments.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <Link
                        to="/invest"
                        className="px-5 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 inline-flex items-center gap-2 font-semibold text-sm shrink-0"
                    >
                        <TrendingUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Browse Campaigns</span>
                    </Link>
                </div>

                {isLoading ? (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-2xl" />
                            ))}
                        </div>
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <LoadingState key={i} variant="skeleton" rows={2} />
                            ))}
                        </div>
                    </>
                ) : error ? (
                    <ErrorState
                        title="Couldn't load your investments"
                        description="Something went wrong while fetching your commitments."
                        detail={error}
                        action={{ label: 'Try again', onClick: loadInvestments }}
                        secondaryAction={{ label: 'Browse campaigns', href: '/invest' }}
                    />
                ) : investments.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title="No investments yet"
                        description="Browse active campaigns and invest in projects you believe in."
                        action={{ label: 'Browse Campaigns', href: '/invest', icon: TrendingUp }}
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatTile
                                label="Total Invested"
                                value={formatCurrency(totalInvested)}
                                icon={Wallet}
                                hint="Paid & confirmed"
                            />
                            <StatTile
                                label="Holdings"
                                value={investments.length}
                                icon={Layers}
                            />
                            <StatTile
                                label="Active"
                                value={activeCount}
                                icon={TrendingUp}
                            />
                            <StatTile
                                label="Pending"
                                value={pendingCount}
                                icon={Hourglass}
                            />
                        </div>

                        <div className="space-y-4">
                            {investments.map((investment, index) => {
                                const { commitment, campaign } = investment;
                                const pay = paymentBadge(commitment.status);
                                const isPending = commitment.status === 'pending';
                                const isActive = PAID_STATUSES.includes(commitment.status) && campaign.status === 'active';
                                const isFunded = campaign.status === 'funded';

                                return (
                                    <motion.div
                                        key={commitment.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-card rounded-2xl border border-border p-6 hover:border-accent/30 transition-all group"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <StatusBadge kind={pay.kind} status={pay.status} label={pay.label} size="sm" />
                                                    <StatusBadge kind="campaign" status={campaign.status} label={`Campaign: ${campaign.status}`} size="sm" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground truncate">
                                                    <Link
                                                        to={`/campaigns/${campaign.id}`}
                                                        className="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                                                    >
                                                        {campaign.title}
                                                    </Link>
                                                </h3>
                                                <p className="text-muted-foreground text-sm mt-1 line-clamp-1">
                                                    {campaign.shortDescription}
                                                </p>

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
                                                        <p className="text-xs text-muted-foreground">Valuation</p>
                                                        <p className="text-sm font-medium text-foreground">{formatCurrency(commitment.valuationAtCommitment)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-2 md:min-w-[140px]">
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Committed</p>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {formatDate(commitment.committedAt)}
                                                    </p>
                                                </div>
                                                {commitment.paidAt && (
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Paid</p>
                                                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {formatDate(commitment.paidAt)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isPending && (
                                            <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                                                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Payment pending — complete it to secure your equity
                                                </p>
                                                <Link
                                                    to={`/campaigns/${campaign.id}/invest`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
                                                >
                                                    <CreditCard className="w-4 h-4" /> Resume payment
                                                </Link>
                                            </div>
                                        )}

                                        {isActive && (
                                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Investment active
                                                </p>
                                                <Link
                                                    to={`/campaigns/${campaign.id}`}
                                                    className="text-sm text-accent font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                                                >
                                                    View Campaign <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        )}

                                        {isFunded && (
                                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4" />
                                                    Campaign fully funded!
                                                </p>
                                                <Link
                                                    to={`/campaigns/${campaign.id}`}
                                                    className="text-sm text-accent font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                                                >
                                                    View Campaign <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};
