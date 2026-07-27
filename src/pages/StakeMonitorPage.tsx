import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Link } from 'react-router-dom';
import {
    Wallet,
    TrendingUp,
    Banknote,
    Layers,
    Loader2,
    AlertCircle,
    Clock,
    CheckCircle2,
    ArrowLeft,
} from 'lucide-react';
import { useFinances, FinanceData } from '../hooks/useFinances';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface Distribution {
    id: string;
    amount: number;
    currency?: string;
    declared_at?: string;
    paid_at?: string | null;
    listings?: { name?: string } | null;
}

const unwrap = <T,>(payload: unknown): T => {
    if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
        return (payload as { data: T }).data;
    }
    return payload as T;
};

const money = (value: number, currency?: string) =>
    currency && currency !== 'USD'
        ? `${currency} ${Number(value || 0).toLocaleString()}`
        : `$${Number(value || 0).toLocaleString()}`;

export const StakeMonitorPage: React.FC = () => {
    const { getFinancesDashboard } = useFinances();
    const { user } = useAuth();

    const [financeData, setFinanceData] = useState<FinanceData | null>(null);
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [financesRes, distRes] = await Promise.all([
                getFinancesDashboard(),
                user
                    ? supabase
                        .from('dividend_distributions')
                        .select('id, amount, currency, declared_at, paid_at, listings(name)')
                        .eq('user_id', user.id)
                        .order('declared_at', { ascending: false })
                    : Promise.resolve({ data: [], error: null } as any),
            ]);

            if (financesRes.success && financesRes.data) {
                setFinanceData(unwrap<FinanceData>(financesRes.data));
            }
            if (distRes.error) {
                if (!financesRes.success) setError('We couldn’t load your stake monitor. Please try again.');
            } else {
                setDistributions((distRes.data as Distribution[]) || []);
            }
            if (!financesRes.success && distRes.error) {
                setError(financesRes.error || 'We couldn’t load your stake monitor. Please try again.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'We couldn’t load your stake monitor. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const stakes = financeData?.stakes || [];
    const metrics = financeData?.metrics;
    const totalInvested = stakes.reduce((sum, s) => sum + (s.amountInvested || 0), 0);
    const portfolioValue = metrics?.portfolioValue ?? totalInvested;
    const lifetimeDividends = distributions
        .filter((d) => d.paid_at)
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const pendingCount = distributions.filter((d) => !d.paid_at).length;

    const stats = [
        { label: 'Total Value Staked', value: money(portfolioValue), icon: <Wallet className="text-blue-600" />, bg: 'bg-blue-500/10' },
        { label: 'Capital Deployed', value: money(totalInvested), icon: <Banknote className="text-emerald-600" />, bg: 'bg-emerald-500/10' },
        { label: 'Lifetime Dividends', value: money(lifetimeDividends), icon: <TrendingUp className="text-purple-600" />, bg: 'bg-purple-500/10' },
        { label: 'Active Stakes', value: String(stakes.length), icon: <Layers className="text-orange-600" />, bg: 'bg-orange-500/10' },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/stakes" className="p-2 rounded-xl hover:bg-muted transition-colors" aria-label="Back to stakes">
                            <ArrowLeft size={20} className="text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground tracking-tight">Stake Monitor</h1>
                            <p className="text-muted-foreground font-medium mt-1">Track your holdings and real dividend distributions.</p>
                        </div>
                    </div>
                    <Link to="/campaigns" className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent/90 transition-all flex items-center gap-2 shrink-0">
                        <TrendingUp size={18} /> Discover Offerings
                    </Link>
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

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="bg-card border border-border p-6 rounded-3xl space-y-4 transition-all group">
                                    <div className={`p-3 ${stat.bg} rounded-2xl w-fit group-hover:scale-110 transition-transform`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                                        <h4 className="text-3xl font-black text-foreground mt-1">{stat.value}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Active Stakes Table */}
                            <div className="lg:col-span-2">
                                <div className="bg-card border border-border rounded-3xl overflow-hidden">
                                    <div className="p-6 border-b border-border">
                                        <h3 className="font-black text-lg text-foreground">Active Stakes</h3>
                                    </div>
                                    {stakes.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                                            <p className="text-foreground font-semibold">No active stakes yet</p>
                                            <p className="text-sm text-muted-foreground mt-1">Invest in a campaign to start monitoring your holdings.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">Asset</th>
                                                        <th className="px-6 py-4 text-right">Invested</th>
                                                        <th className="px-6 py-4 text-right">Ownership</th>
                                                        <th className="px-6 py-4 text-right">Current Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {stakes.map((s) => (
                                                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                                            <td className="px-6 py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">
                                                                        {(s.listing?.name || 'A').charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-bold text-foreground">{s.listing?.name || 'Ownership stake'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right font-bold text-muted-foreground">{money(s.amountInvested || 0)}</td>
                                                            <td className="px-6 py-5 text-right font-semibold text-foreground">{(s.ownershipPercentage || 0).toFixed(4)}%</td>
                                                            <td className="px-6 py-5 text-right font-black text-foreground">{money(s.currentValue ?? s.amountInvested ?? 0)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Distributions timeline */}
                            <div>
                                <div className="bg-card border border-border rounded-3xl p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-foreground">Distributions</h3>
                                        {pendingCount > 0 && (
                                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-600">{pendingCount} pending</span>
                                        )}
                                    </div>
                                    {distributions.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                                            <p className="text-foreground font-semibold text-sm">No distributions yet</p>
                                            <p className="text-xs text-muted-foreground mt-1">Declared and paid dividends will appear here.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {distributions.map((d, idx) => {
                                                const paid = Boolean(d.paid_at);
                                                const date = d.paid_at || d.declared_at;
                                                return (
                                                    <div key={d.id} className="flex gap-3 items-start">
                                                        <div className="flex flex-col items-center">
                                                            <div className={`w-2.5 h-2.5 rounded-full ${paid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                            {idx !== distributions.length - 1 && <div className="w-px h-10 bg-border" />}
                                                        </div>
                                                        <div className="flex-1 -mt-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="font-bold text-sm text-foreground truncate">{d.listings?.name || 'Dividend'}</p>
                                                                <p className="font-black text-sm text-emerald-600 shrink-0">{money(Number(d.amount || 0), d.currency)}</p>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                                                {paid ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Clock size={11} className="text-amber-500" />}
                                                                {paid ? 'Paid' : 'Declared'}{date ? ` · ${new Date(date).toLocaleDateString()}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};
