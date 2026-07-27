import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useSearchParams } from 'react-router-dom';
import {
    Search,
    Grid,
    List,
    SlidersHorizontal,
    Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrowdfunding, CrowdfundingCampaign } from '../hooks/useCrowdfundingSupabase';
import { useAuth } from '../hooks/useAuth';
import { CampaignCard } from '../components/CampaignCard';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { daysRemaining } from '../utils/format';

const SORT_OPTIONS = [
    { value: 'trending', label: 'Trending' },
    { value: 'ending_soon', label: 'Ending Soon' },
    { value: 'newest', label: 'Newest' },
    { value: 'most_funded', label: 'Most Funded' },
    { value: 'highest_equity', label: 'Highest Equity' },
];

const EQUITY_RANGES = [
    { value: '', label: 'Any Equity' },
    { value: '0-10', label: '0 - 10%' },
    { value: '10-25', label: '10 - 25%' },
    { value: '25-50', label: '25 - 50%' },
    { value: '50+', label: '50%+' },
];

export const BrowseCampaignsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { getCampaigns, getWatchlist, setWatchlistCampaign, migrateLocalWatchlist } = useCrowdfunding();

    const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);

    const [watchlist, setWatchlist] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('campaign_watchlist') || '[]');
        } catch {
            return [];
        }
    });

    const [filters, setFilters] = useState({
        status: searchParams.get('status') || 'active',
        fundingType: searchParams.get('fundingType') || '',
        category: searchParams.get('category') || '',
        minGoal: searchParams.get('minGoal') || '',
        maxGoal: searchParams.get('maxGoal') || '',
        minInvestment: searchParams.get('minInvestment') || '',
        maxValuation: searchParams.get('maxValuation') || '',
        endingSoon: searchParams.get('endingSoon') || '',
        search: searchParams.get('search') || '',
        equityRange: searchParams.get('equityRange') || '',
        sortBy: searchParams.get('sortBy') || 'trending',
    });

    /*
     * Filtering boundary (single, non-overlapping source of truth per concern):
     *  - SERVER (in the fetch deps below): the structured filters that scope which
     *    rows come back — status, fundingType, category, goal/investment/valuation
     *    ranges, endingSoon. Some of these (e.g. category) have no client-visible
     *    field on the campaign DTO, so they can only be resolved server-side.
     *  - CLIENT (in the useMemo below): free-text search, the equity band, and sort.
     *    These re-run instantly without a network round-trip, so they are NEVER sent
     *    to the server and are deliberately absent from the fetch deps. This removes
     *    the previous ambiguity where search/equityRange lived in neither place cleanly.
     */
    useEffect(() => {
        loadCampaigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters.status,
        filters.fundingType,
        filters.category,
        filters.minGoal,
        filters.maxGoal,
        filters.minInvestment,
        filters.maxValuation,
        filters.endingSoon,
    ]);

    useEffect(() => {
        syncWatchlist();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const loadCampaigns = async () => {
        setLoading(true);
        setError(null);
        const filterParams: Record<string, string> = {};
        if (filters.status) filterParams.status = filters.status;
        if (filters.fundingType) filterParams.fundingType = filters.fundingType;
        if (filters.category) filterParams.category = filters.category;
        if (filters.minGoal) filterParams.minGoal = filters.minGoal;
        if (filters.maxGoal) filterParams.maxGoal = filters.maxGoal;
        if (filters.minInvestment) filterParams.minInvestment = filters.minInvestment;
        if (filters.maxValuation) filterParams.maxValuation = filters.maxValuation;
        if (filters.endingSoon) filterParams.endingSoon = filters.endingSoon;

        const result = await getCampaigns(filterParams);
        if (result.success && result.data) {
            const data = (result.data as any).data || result.data;
            setCampaigns(Array.isArray(data) ? data : []);
        } else {
            setError((result as any).error || 'We could not load campaigns.');
        }
        setLoading(false);
    };

    const syncWatchlist = async () => {
        if (!user) return;

        let localIds: string[] = [];
        try {
            localIds = JSON.parse(localStorage.getItem('campaign_watchlist') || '[]');
        } catch {
            localIds = [];
        }

        if (localIds.length > 0) {
            const migration = await migrateLocalWatchlist(localIds);
            if (migration.success) {
                localStorage.removeItem('campaign_watchlist');
            }
        }

        const result = await getWatchlist();
        if (result.success && result.data) {
            setWatchlist((result.data as any).data || result.data);
        }
    };

    const toggleWatchlist = async (campaignId: string) => {
        const shouldWatch = !watchlist.includes(campaignId);
        // Optimistic update, toggling only the affected id.
        setWatchlist((current) =>
            shouldWatch ? [...current, campaignId] : current.filter((id) => id !== campaignId),
        );

        if (user) {
            const result = await setWatchlistCampaign(campaignId, shouldWatch);
            if (!result.success) {
                // Roll back just this id via a functional update — immune to stale closures.
                setWatchlist((current) =>
                    shouldWatch
                        ? current.filter((id) => id !== campaignId)
                        : current.includes(campaignId)
                            ? current
                            : [...current, campaignId],
                );
            }
        } else {
            const next = shouldWatch
                ? [...watchlist, campaignId]
                : watchlist.filter((id) => id !== campaignId);
            localStorage.setItem('campaign_watchlist', JSON.stringify(next));
        }
    };

    const isWatched = (campaignId: string) => watchlist.includes(campaignId);

    const filteredAndSortedCampaigns = useMemo(() => {
        let result = [...campaigns];

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(c =>
                c.title.toLowerCase().includes(searchLower) ||
                c.shortDescription?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.equityRange) {
            const [min, max] = filters.equityRange.split('-').map(Number);
            result = result.filter(campaign => {
                const equity = Number(campaign.equityOfferedPct);
                if (!isNaN(max)) {
                    return equity >= min && equity <= max;
                }
                return equity >= min;
            });
        }

        switch (filters.sortBy) {
            case 'ending_soon':
                result.sort((a, b) => {
                    const aDays = a.endDate ? daysRemaining(a.endDate) : Infinity;
                    const bDays = b.endDate ? daysRemaining(b.endDate) : Infinity;
                    return aDays - bDays;
                });
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'most_funded':
                result.sort((a, b) => b.fundingRaised - a.fundingRaised);
                break;
            case 'highest_equity':
                result.sort((a, b) => Number(b.equityOfferedPct) - Number(a.equityOfferedPct));
                break;
            case 'trending':
            default:
                result.sort((a, b) => b.currentInvestorCount - a.currentInvestorCount);
        }

        return result;
    }, [campaigns, filters.search, filters.equityRange, filters.sortBy]);

    const activeFilterCount = Object.values({
        fundingType: filters.fundingType,
        category: filters.category,
        minGoal: filters.minGoal,
        maxGoal: filters.maxGoal,
        minInvestment: filters.minInvestment,
        maxValuation: filters.maxValuation,
        endingSoon: filters.endingSoon,
    }).filter(Boolean).length;

    const resetFilters = () =>
        setFilters({
            status: '', fundingType: '', category: '', minGoal: '', maxGoal: '',
            minInvestment: '', maxValuation: '', endingSoon: '', search: '', equityRange: '', sortBy: 'trending',
        });

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="mb-10">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="max-w-2xl">
                            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Investment Opportunities</h1>
                            <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
                                Discover promising startups, back innovative MVPs, and secure your fractional equity stake.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 self-start lg:self-end w-full lg:w-auto">
                            <div className="relative w-full lg:w-72 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <label htmlFor="campaign-search" className="sr-only">Search campaigns</label>
                                <input
                                    id="campaign-search"
                                    type="text"
                                    placeholder="Search campaigns..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl leading-5 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition duration-150 ease-in-out sm:text-sm"
                                />
                            </div>
                            <div className="hidden sm:flex items-center gap-1 bg-muted p-1 rounded-xl border border-border" role="group" aria-label="View mode">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    aria-label="Grid view"
                                    aria-pressed={viewMode === 'grid'}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    aria-label="List view"
                                    aria-pressed={viewMode === 'list'}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-card rounded-2xl border border-border p-2 mb-8 sticky top-4 z-20 shadow-sm shadow-black/5">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 flex-1 md:flex-none">
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                aria-expanded={showFilters}
                                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full md:w-auto ${showFilters || activeFilterCount > 0
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'bg-muted text-foreground hover:bg-muted/70 border border-transparent'
                                    }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-5 h-5 text-[10px]">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="hidden md:flex items-center gap-2 border-l border-border pl-2">
                            <label htmlFor="status-filter" className="sr-only">Status</label>
                            <select
                                id="status-filter"
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="px-4 py-2 bg-transparent hover:bg-muted border border-transparent hover:border-border rounded-xl text-sm text-foreground cursor-pointer outline-none transition-colors"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="paused">Paused</option>
                            </select>

                            <label htmlFor="equity-filter" className="sr-only">Equity range</label>
                            <select
                                id="equity-filter"
                                value={filters.equityRange}
                                onChange={(e) => setFilters(prev => ({ ...prev, equityRange: e.target.value }))}
                                className="px-4 py-2 bg-transparent hover:bg-muted border border-transparent hover:border-border rounded-xl text-sm text-foreground cursor-pointer outline-none transition-colors"
                            >
                                {EQUITY_RANGES.map(range => (
                                    <option key={range.value} value={range.value}>{range.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 ml-auto w-full md:w-auto mt-2 md:mt-0">
                            <span className="text-sm font-medium text-muted-foreground hidden sm:block">Sort by:</span>
                            <label htmlFor="sort-filter" className="sr-only">Sort by</label>
                            <select
                                id="sort-filter"
                                value={filters.sortBy}
                                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                                className="px-4 py-2 bg-muted border border-border rounded-xl text-sm cursor-pointer outline-none font-medium text-foreground w-full md:w-auto"
                            >
                                {SORT_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Advanced Filters Dropdown */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-border mt-2"
                            >
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-muted/50 rounded-xl mt-2 relative">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFilters(prev => ({
                                                ...prev,
                                                fundingType: '',
                                                category: '',
                                                minGoal: '',
                                                maxGoal: '',
                                                minInvestment: '',
                                                maxValuation: '',
                                                endingSoon: '',
                                            }))
                                        }
                                        className="absolute top-4 right-4 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                    >
                                        Clear
                                    </button>
                                    <div>
                                        <label htmlFor="min-goal" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Min Goal (₦)</label>
                                        <input
                                            id="min-goal"
                                            type="number"
                                            placeholder="0"
                                            value={filters.minGoal}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minGoal: e.target.value }))}
                                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="max-goal" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Max Goal (₦)</label>
                                        <input
                                            id="max-goal"
                                            type="number"
                                            placeholder="No limit"
                                            value={filters.maxGoal}
                                            onChange={(e) => setFilters(prev => ({ ...prev, maxGoal: e.target.value }))}
                                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="funding-type" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Funding Type</label>
                                        <select
                                            id="funding-type"
                                            value={filters.fundingType}
                                            onChange={(e) => setFilters(prev => ({ ...prev, fundingType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none"
                                        >
                                            <option value="">Any</option>
                                            <option value="split">Fractional Split</option>
                                            <option value="pay_once">Single Backer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="category" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Category</label>
                                        <input
                                            id="category"
                                            type="text"
                                            placeholder="Any category"
                                            value={filters.category}
                                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="min-investment" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Min Investment</label>
                                        <input
                                            id="min-investment"
                                            type="number"
                                            placeholder="0"
                                            value={filters.minInvestment}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minInvestment: e.target.value }))}
                                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="max-valuation" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Max Valuation</label>
                                        <input
                                            id="max-valuation"
                                            type="number"
                                            placeholder="No limit"
                                            value={filters.maxValuation}
                                            onChange={(e) => setFilters(prev => ({ ...prev, maxValuation: e.target.value }))}
                                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={filters.endingSoon === 'true'}
                                            onChange={(e) => setFilters(prev => ({ ...prev, endingSoon: e.target.checked ? 'true' : '' }))}
                                            className="h-4 w-4 rounded border-border accent-primary"
                                        />
                                        Ending soon
                                    </label>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                                <Skeleton className="aspect-[16/9] w-full rounded-none" />
                                <div className="space-y-3 p-5">
                                    <Skeleton className="h-5 w-2/3" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-2.5 w-full rounded-full" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Unable to load campaigns"
                        description="Something went wrong while fetching investment opportunities."
                        detail={error}
                        action={{ label: 'Try again', onClick: loadCampaigns }}
                    />
                ) : filteredAndSortedCampaigns.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No campaigns found"
                        description="Try adjusting your filters or check back later for new investment opportunities."
                        action={{ label: 'Reset filters', onClick: resetFilters }}
                    />
                ) : (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {filteredAndSortedCampaigns.map((campaign) => (
                            <CampaignCard
                                key={campaign.id}
                                campaign={campaign}
                                variant={viewMode}
                                isWatched={isWatched(campaign.id)}
                                onToggleWatch={toggleWatchlist}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
