import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import {
    ShieldCheck,
    ArrowRight,
    FileText,
    Lock,
    ChevronRight,
    Search,
    Inbox,
    LifeBuoy,
} from 'lucide-react';
import { useEscrow, EscrowDeal } from '../hooks/useEscrow';
import { Link } from 'react-router-dom';
import {
    StatusBadge,
    StatTile,
    LoadingState,
    ErrorState,
    EmptyState,
} from '../components/ui';
import { formatCurrency, formatTimeRemaining } from '../utils/format';

const ACTIVE_STATUSES: EscrowDeal['status'][] = ['funding', 'funded', 'inspection', 'approval', 'releasing'];

const asString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value : undefined;
const asNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const getTimestamp = (deal: EscrowDeal, keys: string[]) => {
    const record = deal as EscrowDeal & Record<string, unknown>;
    for (const key of keys) {
        const value = asString(record[key]);
        if (value) return value;
    }
    return undefined;
};

/** Resolve the active deadline for a deal (funding due / inspection ends), if any. */
const getDealDeadline = (deal: EscrowDeal): string | undefined => {
    const fundingDeadline = getTimestamp(deal, ['fundingDeadline', 'fundingDueAt', 'fundingExpiresAt', 'paymentDueAt']);
    const inspectionEndsAt = getTimestamp(deal, ['inspectionEndsAt', 'inspectionEndAt', 'inspectionDeadline', 'inspectionDueAt']);
    const inspectionStartedAt = getTimestamp(deal, ['inspectionStartedAt', 'inspectionStartAt', 'fundedAt']);
    const inspectionPeriodHours = asNumber((deal as EscrowDeal & Record<string, unknown>).inspectionPeriodHours);
    const derivedInspectionEndsAt = !inspectionEndsAt && inspectionStartedAt && inspectionPeriodHours
        ? new Date(new Date(inspectionStartedAt).getTime() + inspectionPeriodHours * 60 * 60 * 1000).toISOString()
        : inspectionEndsAt;
    if (deal.status === 'funding') return fundingDeadline;
    if (deal.status === 'inspection') return derivedInspectionEndsAt;
    return undefined;
};

const getDealTimerLabel = (deal: EscrowDeal): string | undefined => {
    const deadline = getDealDeadline(deal);
    if (deadline) return formatTimeRemaining(deadline);
    return deal.timeLeft;
};

type FilterKey = 'all' | 'active' | 'completed' | 'disputed';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'disputed', label: 'Disputed' },
];

export const EscrowDashboardPage: React.FC = () => {
    const [deals, setDeals] = useState<EscrowDeal[]>([]);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { getMyEscrowDeals, getEscrowStats, isLoading, error } = useEscrow();
    const [serverStats, setServerStats] = useState<{ totalValue: number; activeDeals: number; completedDeals: number } | null>(null);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        const [dealsResult, statsResult] = await Promise.all([
            getMyEscrowDeals(),
            getEscrowStats(),
        ]);

        if (dealsResult.success && dealsResult.data) {
            setDeals(dealsResult.data.data || []);
        }
        if (statsResult.success && statsResult.data?.data) {
            setServerStats(statsResult.data.data);
        }
    };

    const filteredDeals = deals.filter(deal => {
        const matchesFilter = filter === 'all' ||
            (filter === 'active' && ACTIVE_STATUSES.includes(deal.status)) ||
            (filter === 'completed' && deal.status === 'completed') ||
            (filter === 'disputed' && deal.status === 'disputed');

        const matchesSearch = searchQuery === '' ||
            deal.listingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            deal.id.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    // Single source of truth for the summary: prefer the server stats, fall back
    // to client-side aggregation of the loaded deals.
    const summary = {
        totalValue: serverStats?.totalValue
            ?? deals.filter(d => ACTIVE_STATUSES.includes(d.status)).reduce((sum, d) => sum + d.amount, 0),
        activeDeals: serverStats?.activeDeals
            ?? deals.filter(d => ACTIVE_STATUSES.includes(d.status)).length,
        completedDeals: serverStats?.completedDeals
            ?? deals.filter(d => d.status === 'completed').length,
        disputedDeals: deals.filter(d => d.status === 'disputed').length,
    };

    const hasSearch = searchQuery.trim() !== '' || filter !== 'all';

    const infoCards = [
        { icon: Lock, title: 'Funds protection', desc: 'Funds held in a segregated account, protected against platform insolvency.' },
        { icon: FileText, title: 'Asset verification', desc: 'Standard inspection period to audit codebases, domains, and financial logs.' },
        { icon: ShieldCheck, title: 'Dispute mediation', desc: 'Neutral compliance team resolves issues based on the signed agreement.' },
    ];

    return (
        <Layout>
            <div className="min-h-screen bg-background transition-colors">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">

                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold uppercase tracking-[0.16em] bg-emerald-500/10 w-fit px-3 py-1.5 rounded-full border border-emerald-500/20">
                                <ShieldCheck size={12} /> Secure transaction layer
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                                Escrow Dashboard
                            </h1>
                            <p className="text-muted-foreground text-base max-w-2xl">
                                Monitor and manage your active acquisitions. Funds are held securely during inspection and transfer.
                            </p>
                        </div>

                        <StatTile
                            label="Total in escrow"
                            value={formatCurrency(summary.totalValue)}
                            hint="Funds currently secured"
                            align="right"
                            className="min-w-[200px]"
                        />
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <StatTile label="Active" value={summary.activeDeals} icon={ShieldCheck} />
                        <StatTile label="Completed" value={summary.completedDeals} />
                        <StatTile
                            label="Disputed"
                            value={summary.disputedDeals}
                            className="col-span-2 sm:col-span-1"
                        />
                    </div>

                    {/* Search + Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card border border-border rounded-2xl p-4">
                        <div className="w-full sm:max-w-sm">
                            <label htmlFor="escrow-search" className="sr-only">Search deals</label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden="true" />
                                <input
                                    id="escrow-search"
                                    type="search"
                                    placeholder="Search by asset or deal ID…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div
                            role="tablist"
                            aria-label="Filter deals by status"
                            className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            {FILTER_TABS.map(tab => {
                                const selected = filter === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        role="tab"
                                        aria-selected={selected}
                                        onClick={() => setFilter(tab.key)}
                                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Deals list */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                <ShieldCheck size={18} className="text-muted-foreground" />
                                Acquisitions
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="p-5 sm:p-6">
                                <LoadingState variant="skeleton" rows={4} />
                            </div>
                        ) : error ? (
                            <div className="p-5 sm:p-6">
                                <ErrorState
                                    title="Failed to load escrow deals"
                                    description="Something went wrong while loading your acquisitions."
                                    detail={error}
                                    action={{ label: 'Try again', onClick: fetchData }}
                                />
                            </div>
                        ) : filteredDeals.length === 0 ? (
                            <div className="p-5 sm:p-6">
                                {deals.length === 0 ? (
                                    <EmptyState
                                        icon={ShieldCheck}
                                        title="No escrow deals yet"
                                        description="When you buy or sell an asset through escrow, the deal will appear here so you can track funding, transfer, and release."
                                        action={{ label: 'Browse the marketplace', href: '/marketplace', icon: ArrowRight }}
                                    />
                                ) : (
                                    <EmptyState
                                        icon={Inbox}
                                        title="No matching deals"
                                        description="No deals match your current search and filter. Try clearing them to see everything."
                                        action={{
                                            label: 'Clear search & filters',
                                            onClick: () => { setSearchQuery(''); setFilter('all'); },
                                        }}
                                    />
                                )}
                            </div>
                        ) : (
                            <div>
                                {/* Column header (desktop only) */}
                                <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1.2fr_auto] gap-4 px-6 py-3 bg-muted text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                    <span>Asset</span>
                                    <span>Parties</span>
                                    <span className="text-right">Value</span>
                                    <span>Status</span>
                                    <span className="sr-only">Open</span>
                                </div>
                                <ul className="divide-y divide-border">
                                    {filteredDeals.map(deal => {
                                        const timer = getDealTimerLabel(deal);
                                        return (
                                            <li key={deal.id}>
                                                <Link
                                                    to={`/escrow/${deal.id}`}
                                                    className="group block px-5 sm:px-6 py-5 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid md:grid-cols-[2fr_2fr_1fr_1.2fr_auto] md:items-center md:gap-4"
                                                >
                                                    {/* Asset */}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                            {deal.listingName}
                                                        </p>
                                                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                                            {deal.id.slice(0, 8)}…
                                                        </p>
                                                    </div>

                                                    {/* Parties — visible on mobile too */}
                                                    <div className="mt-3 md:mt-0 space-y-0.5">
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="font-medium text-foreground/70">Buyer:</span> {deal.buyerName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="font-medium text-foreground/70">Seller:</span> {deal.sellerName}
                                                        </p>
                                                    </div>

                                                    {/* Value */}
                                                    <div className="mt-3 md:mt-0 md:text-right">
                                                        <span className="md:hidden text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mr-2">Value</span>
                                                        <span className="text-sm font-bold text-foreground">{formatCurrency(deal.amount)}</span>
                                                    </div>

                                                    {/* Status */}
                                                    <div className="mt-3 md:mt-0 space-y-1">
                                                        <StatusBadge
                                                            kind="escrow"
                                                            status={deal.status}
                                                            dot
                                                            pulse={ACTIVE_STATUSES.includes(deal.status)}
                                                            size="sm"
                                                        />
                                                        {timer && <p className="text-[11px] text-muted-foreground">{timer}</p>}
                                                    </div>

                                                    {/* Chevron */}
                                                    <div className="mt-3 md:mt-0 flex items-center justify-end text-muted-foreground">
                                                        <span className="text-xs font-semibold text-primary md:hidden">Manage deal</span>
                                                        <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {infoCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.title} className="bg-card border border-border rounded-2xl p-6 space-y-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Security Banner */}
                    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4">
                        <div className="p-2.5 bg-error/10 rounded-xl text-error shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h4 className="text-sm font-bold text-foreground">Security protocol</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                All communication during inspection must occur within the platform. External discussions may void your escrow protection.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-1">
                                <Link to="/legal" className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5 hover:underline">
                                    Escrow policy <ChevronRight size={12} />
                                </Link>
                                <Link to="/support?topic=escrow" className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5 hover:underline">
                                    <LifeBuoy size={12} /> Contact compliance
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
