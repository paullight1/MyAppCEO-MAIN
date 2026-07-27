import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Link } from 'react-router-dom';
import { Plus, DollarSign, Search, Play } from 'lucide-react';
import { useCrowdfunding, CrowdfundingCampaign } from '../hooks/useCrowdfundingSupabase';
import { CampaignCard } from '../components/CampaignCard';
import { EmptyState, ErrorState, Skeleton, Button } from '../components/ui';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { daysRemaining } from '../utils/format';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'most_funded', label: 'Most Funded' },
    { value: 'most_investors', label: 'Most Investors' },
    { value: 'ending_soon', label: 'Ending Soon' },
];

export const MyCampaignsPage: React.FC = () => {
    const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('newest');

    const [publishTarget, setPublishTarget] = useState<CrowdfundingCampaign | null>(null);
    const [publishing, setPublishing] = useState(false);

    const { getMyCampaigns, publishCampaign } = useCrowdfunding();

    useEffect(() => {
        loadCampaigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadCampaigns = async () => {
        setIsLoading(true);
        setError(null);
        const result = await getMyCampaigns();
        if (result.success && result.data) {
            setCampaigns((result.data as any).data || result.data);
        } else {
            setError((result as any).error || 'We could not load your campaigns.');
        }
        setIsLoading(false);
    };

    const handlePublish = async () => {
        if (!publishTarget) return;
        setPublishing(true);
        const result = await publishCampaign(publishTarget.id);
        if (result.success && result.data) {
            const updated = (result.data as any).data || result.data;
            setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setPublishTarget(null);
        } else {
            setError((result as any).error || 'Failed to publish campaign.');
            setPublishTarget(null);
        }
        setPublishing(false);
    };

    const filteredCampaigns = useMemo(() => {
        let result = [...campaigns];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(campaign =>
                campaign.title.toLowerCase().includes(query) ||
                campaign.shortDescription?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(campaign => campaign.status === statusFilter);
        }

        switch (sortBy) {
            case 'oldest':
                result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'most_funded':
                result.sort((a, b) => b.fundingRaised - a.fundingRaised);
                break;
            case 'most_investors':
                result.sort((a, b) => b.currentInvestorCount - a.currentInvestorCount);
                break;
            case 'ending_soon':
                result.sort((a, b) => {
                    const aDays = a.endDate ? daysRemaining(a.endDate) : Infinity;
                    const bDays = b.endDate ? daysRemaining(b.endDate) : Infinity;
                    return aDays - bDays;
                });
                break;
            case 'newest':
            default:
                result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return result;
    }, [campaigns, searchQuery, statusFilter, sortBy]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: campaigns.length };
        campaigns.forEach(campaign => {
            counts[campaign.status] = (counts[campaign.status] || 0) + 1;
        });
        return counts;
    }, [campaigns]);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">My Campaigns</h1>
                        <p className="text-muted-foreground mt-1">
                            {campaigns.length === 0
                                ? 'Create your first funding campaign'
                                : `${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <Link
                        to="/campaigns/new"
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 font-semibold text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Campaign
                    </Link>
                </div>

                {campaigns.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <label htmlFor="my-search" className="sr-only">Search campaigns</label>
                            <input
                                id="my-search"
                                type="text"
                                placeholder="Search campaigns..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary outline-none"
                            />
                        </div>
                        <label htmlFor="my-status" className="sr-only">Filter by status</label>
                        <select
                            id="my-status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-primary outline-none"
                        >
                            <option value="all">All Status ({statusCounts.all})</option>
                            <option value="draft">Draft ({statusCounts.draft || 0})</option>
                            <option value="active">Active ({statusCounts.active || 0})</option>
                            <option value="completed">Completed ({statusCounts.completed || 0})</option>
                            <option value="paused">Paused ({statusCounts.paused || 0})</option>
                            <option value="cancelled">Cancelled ({statusCounts.cancelled || 0})</option>
                        </select>
                        <label htmlFor="my-sort" className="sr-only">Sort campaigns</label>
                        <select
                            id="my-sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-primary outline-none"
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-border bg-card">
                                <Skeleton className="aspect-[16/10] w-full rounded-none sm:aspect-auto sm:w-2/5" />
                                <div className="flex-1 space-y-3 p-5">
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
                        title="Unable to load your campaigns"
                        description="Something went wrong while fetching your campaigns."
                        detail={error}
                        action={{ label: 'Try again', onClick: loadCampaigns }}
                    />
                ) : campaigns.length === 0 ? (
                    <EmptyState
                        icon={DollarSign}
                        title="No campaigns yet"
                        description="Create a funding campaign to raise capital from investors for your app project."
                        action={{ label: 'Create Your First Campaign', href: '/campaigns/new', icon: Plus }}
                    />
                ) : filteredCampaigns.length === 0 ? (
                    <EmptyState
                        icon={Search}
                        title="No campaigns match your search"
                        description="Try adjusting your search or status filter."
                        action={{ label: 'Clear filters', onClick: () => { setSearchQuery(''); setStatusFilter('all'); } }}
                    />
                ) : (
                    <div className="space-y-4">
                        {filteredCampaigns.map((campaign) => (
                            <div key={campaign.id} className="space-y-2">
                                <CampaignCard campaign={campaign} variant="list" />
                                {campaign.status === 'draft' && (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
                                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                            Draft — publish to start accepting investments
                                        </p>
                                        <Button
                                            onClick={() => setPublishTarget(campaign)}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 self-start sm:self-auto"
                                            size="sm"
                                        >
                                            <Play className="w-4 h-4" /> Publish
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={Boolean(publishTarget)}
                onOpenChange={(open) => { if (!open) setPublishTarget(null); }}
                title="Publish this campaign?"
                description={
                    publishTarget
                        ? `"${publishTarget.title}" will go live and start accepting investments. Make sure the details are final.`
                        : undefined
                }
                confirmLabel="Publish"
                tone="primary"
                loading={publishing}
                onConfirm={handlePublish}
            />
        </DashboardLayout>
    );
};
