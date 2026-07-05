import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    TrendingUp,
    PieChart,
    History,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Percent,
    Banknote
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFinances, FinanceData } from '../hooks/useFinances';
import { useCrowdfunding } from '../hooks/useCrowdfundingSupabase';
import { Link } from 'react-router-dom';

interface InvestmentRow {
    commitment?: { amount?: number | string; stakePct?: number | string };
    campaign?: { title?: string; coverImageUrl?: string };
}

const unwrap = <T,>(payload: unknown): T => {
    if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
        return (payload as { data: T }).data;
    }
    return payload as T;
};

export const StakesPage: React.FC = () => {
    const { getFinancesDashboard } = useFinances();
    const { getMyInvestments } = useCrowdfunding();

    const [financeData, setFinanceData] = useState<FinanceData | null>(null);
    const [investments, setInvestments] = useState<InvestmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        const [financesRes, investmentsRes] = await Promise.all([
            getFinancesDashboard(),
            getMyInvestments()
        ]);

        if (financesRes.success && financesRes.data) {
            setFinanceData(unwrap<FinanceData>(financesRes.data));
        }
        if (investmentsRes.success && investmentsRes.data) {
            setInvestments(unwrap<InvestmentRow[]>(investmentsRes.data) || []);
        }

        if (!financesRes.success && !investmentsRes.success) {
            setError(financesRes.error || investmentsRes.error || 'We couldn’t load your stakes. Please try again.');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                        <p className="text-muted-foreground mt-4 font-medium text-sm">Loading your stakes...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const stakes = financeData?.stakes || [];
    const metrics = financeData?.metrics || {
        portfolioValue: 0,
        portfolioValueChange: 0,
        dividendsEarned: 0,
        dividendsEarnedChange: 0
    };

    // Normalize the two data sources (finance stakes + crowdfunding commitments)
    // into a single holdings list so the count, list, and totals never disagree.
    type Holding = {
        key: string;
        title: string;
        imageUrl?: string;
        ownershipPct: number;
        invested: number;
        currentValue: number | null;
    };

    const holdings: Holding[] = stakes.length
        ? stakes.map((s) => ({
            key: s.id,
            title: s.listing?.name || 'Ownership stake',
            ownershipPct: s.ownershipPercentage || 0,
            invested: s.amountInvested || 0,
            currentValue: s.currentValue ?? null,
        }))
        : investments.map((inv, i) => ({
            key: `inv-${i}`,
            title: inv.campaign?.title || 'Unknown Asset',
            imageUrl: inv.campaign?.coverImageUrl,
            ownershipPct: Number(inv.commitment?.stakePct) || 0,
            invested: Number(inv.commitment?.amount) || 0,
            currentValue: null,
        }));

    // Real dividends paid per holding (not monthly revenue).
    const dividendPayouts = stakes
        .filter((s) => (s.totalDividends || 0) > 0)
        .map((s) => ({ key: s.id, title: s.listing?.name || 'Ownership stake', amount: s.totalDividends }));

    const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0);
    const activeOfferingsCount = holdings.length;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Stakes & Ownership</h1>
                        <p className="text-muted-foreground font-medium mt-1">Track your investor cap table, portfolio metrics, and dividend payouts.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/stakes/monitor" className="px-6 py-3 bg-card border border-border text-foreground rounded-xl hover:bg-muted transition-all font-semibold flex items-center gap-2 text-sm">
                            <PieChart size={18} /> Stake Monitor
                        </Link>
                        <Link to="/campaigns" className="px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-sm shadow-accent/20 font-semibold flex items-center gap-2 text-sm">
                            <TrendingUp size={18} /> Discover New Offerings
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={18} className="text-red-500 shrink-0" />
                            <p className="text-sm text-red-500 font-medium">{error}</p>
                        </div>
                        <button onClick={loadData} className="text-sm font-semibold text-red-500 hover:underline shrink-0">Retry</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Banknote size={64} />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
                            Total Capital Deployed
                        </p>
                        <p className="text-4xl font-bold text-foreground relative z-10">${totalInvested.toLocaleString()}</p>
                        {totalInvested > 0 && (
                            <div className="mt-4 flex items-center gap-2 text-emerald-500 text-sm font-bold relative z-10">
                                <CheckCircle2 size={16} /> Fully Confirmed
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp size={64} />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Portfolio Value</p>
                        <p className="text-4xl font-bold text-foreground relative z-10">${(metrics.portfolioValue || 0).toLocaleString()}</p>
                        <p className={`mt-4 text-sm font-bold flex items-center gap-1 relative z-10 ${metrics.portfolioValueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {metrics.portfolioValueChange >= 0 ? '+' : ''}{metrics.portfolioValueChange?.toFixed(2) || '0.00'}% This Month
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Percent size={64} />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Active Ownerships</p>
                        <p className="text-4xl font-bold text-foreground relative z-10">{activeOfferingsCount}</p>
                        <div className="mt-4 flex items-center gap-2 text-accent text-sm font-bold relative z-10">
                            Across {activeOfferingsCount} {activeOfferingsCount === 1 ? 'campaign' : 'campaigns'}
                        </div>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-card p-8 rounded-[40px] border border-border shadow-sm space-y-6 flex flex-col"
                    >
                        <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <PieChart size={20} className="text-accent" />
                            Your Equity Portfolio
                        </h3>

                        <div className="space-y-4 flex-1">
                            {holdings.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20 border border-dashed border-border rounded-3xl">
                                    <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
                                    <p className="text-foreground font-semibold">No active stakes found.</p>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">You haven't invested in any active campaigns yet. Browse open campaigns to start building your portfolio.</p>
                                </div>
                            ) : (
                                holdings.map((h) => {
                                    const gain = h.currentValue != null ? h.currentValue - h.invested : null;
                                    return (
                                        <div key={h.key} className="group flex justify-between items-center p-5 bg-muted/30 hover:bg-muted/60 transition-colors rounded-2xl border border-transparent hover:border-border">
                                            <div className="flex items-center gap-4 min-w-0">
                                                {h.imageUrl ? (
                                                    <img src={h.imageUrl} alt={h.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-lg shrink-0">
                                                        {h.title.charAt(0).toUpperCase() || 'A'}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-foreground text-sm group-hover:text-accent transition-colors truncate">{h.title}</p>
                                                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{h.ownershipPct.toFixed(4)}% Ownership</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 pl-3">
                                                <p className="font-bold text-foreground text-lg">${(h.currentValue ?? h.invested).toLocaleString()}</p>
                                                {gain != null ? (
                                                    <p className={`text-[10px] uppercase font-bold mt-0.5 ${gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {gain >= 0 ? '+' : ''}${Math.abs(gain).toLocaleString()} {gain >= 0 ? 'gain' : 'loss'}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">Invested</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-card p-8 rounded-[40px] border border-border shadow-sm space-y-6 flex flex-col"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                <History size={20} className="text-accent" />
                                Payout & Dividend History
                            </h3>
                            <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                                ${(metrics.dividendsEarned || 0).toLocaleString()} Lifetime
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {dividendPayouts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20 border border-dashed border-border rounded-3xl">
                                    <History className="w-12 h-12 text-muted-foreground/50 mb-3" />
                                    <p className="text-foreground font-semibold">No dividends paid yet.</p>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">Your stakes haven't yielded any dividends. Payouts appear here once your holdings start distributing profit.</p>
                                </div>
                            ) : (
                                dividendPayouts.map((payout) => (
                                    <div key={payout.key} className="flex justify-between items-center p-5 border border-border bg-card rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                                                <CheckCircle2 size={20} className="text-emerald-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-foreground text-sm truncate">{payout.title}</p>
                                                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Dividends to date</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-emerald-600 text-lg shrink-0 pl-3">+${payout.amount.toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};
