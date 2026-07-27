import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    DollarSign,
    Users,
    Loader2,
    CheckCircle2,
    TrendingUp,
    Clock,
    Share2,
    Copy,
    Play,
    X,
    Pencil,
    Megaphone,
    Target,
    Wallet,
    PieChart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useCrowdfunding,
    CrowdfundingCampaign,
    Investor,
    CampaignUpdate,
} from '../hooks/useCrowdfundingSupabase';
import { useAuth } from '../hooks/useAuth';
import {
    StatTile,
    ProgressBar,
    StatusBadge,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    EmptyState,
    ErrorState,
    Skeleton,
    Button,
} from '../components/ui';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    formatCurrency,
    formatCompactCurrency,
    formatPercent,
    formatDate,
    formatRelativeTime,
    clampPercent,
    daysRemaining,
} from '../utils/format';

type TabId = 'overview' | 'investors' | 'updates';

export const CampaignDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        getCampaignById,
        getInvestors,
        getCampaignUpdates,
        publishCampaign,
        cancelCampaign,
        updateCampaign,
        createShareLink,
    } = useCrowdfunding();

    const [campaign, setCampaign] = useState<CrowdfundingCampaign | null>(null);
    const [investors, setInvestors] = useState<Investor[]>([]);
    const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', shortDescription: '', longDescription: '' });

    useEffect(() => {
        loadCampaign();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadCampaign = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);

        const result = await getCampaignById(id);
        if (result.success && result.data) {
            const campaignData = (result.data as any).data || result.data;
            setCampaign(campaignData);

            if (campaignData.status === 'active' || campaignData.status === 'completed' || campaignData.status === 'funded') {
                const investorsResult = await getInvestors(id);
                if (investorsResult.success && investorsResult.data) {
                    setInvestors((investorsResult.data as any).data || investorsResult.data);
                }
            }

            const updatesResult = await getCampaignUpdates(id);
            if (updatesResult.success && updatesResult.data) {
                setUpdates((updatesResult.data as any).data || updatesResult.data);
            }
        } else {
            setError((result as any).error || 'Failed to load campaign');
        }
        setLoading(false);
    };

    const handlePublish = async () => {
        if (!campaign) return;
        setActionError(null);
        setActionLoading('publish');
        const result = await publishCampaign(campaign.id);
        if (result.success && result.data) {
            setCampaign((result.data as any).data || result.data);
        } else {
            setActionError((result as any).error || 'Failed to publish campaign.');
        }
        setActionLoading(null);
    };

    const handleCancel = async () => {
        if (!campaign) return;
        const reason = cancelReason.trim();
        if (!reason) return;
        setActionError(null);
        setActionLoading('cancel');
        const result = await cancelCampaign(campaign.id, reason);
        if (result.success && result.data) {
            setCampaign((result.data as any).data || result.data);
            setCancelReason('');
            setCancelOpen(false);
        } else {
            setActionError((result as any).error || 'Failed to cancel campaign.');
        }
        setActionLoading(null);
    };

    const openEdit = () => {
        if (!campaign) return;
        setEditForm({
            title: campaign.title,
            shortDescription: campaign.shortDescription || '',
            longDescription: campaign.longDescription || '',
        });
        setActionError(null);
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!campaign) return;
        setActionError(null);
        setActionLoading('edit');
        const result = await updateCampaign(campaign.id, {
            title: editForm.title.trim(),
            shortDescription: editForm.shortDescription.trim(),
            longDescription: editForm.longDescription.trim(),
        });
        if (result.success && result.data) {
            setCampaign((result.data as any).data || result.data);
            setEditOpen(false);
        } else {
            setActionError((result as any).error || 'Failed to save changes.');
        }
        setActionLoading(null);
    };

    const handleCreateShareLink = async () => {
        if (!campaign) return;
        setActionError(null);
        setActionLoading('share');
        const result = await createShareLink(campaign.id, { expiresInDays: 30 });
        if (result.success && result.data) {
            const linkData = (result.data as any).data || result.data;
            setShareLink(linkData.shareUrl || `${window.location.origin}/campaigns/share/${linkData.shareToken}`);
        } else {
            setActionError((result as any).error || 'Failed to create share link.');
        }
        setActionLoading(null);
    };

    const handleCopyLink = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isOwner = Boolean(campaign && user && campaign.ownerId === user.id);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto py-8">
                    <Skeleton className="h-9 w-24 mb-6" />
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <Skeleton className="aspect-[3/1] w-full rounded-none" />
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-8 w-2/3" />
                            <Skeleton className="h-4 w-full" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                                ))}
                            </div>
                            <Skeleton className="h-3 w-full rounded-full" />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error && !campaign) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto py-8">
                    <ErrorState
                        title="Unable to load campaign"
                        description="We could not load this campaign. It may have been removed, or there was a network problem."
                        detail={error}
                        action={{ label: 'Try again', onClick: loadCampaign }}
                        secondaryAction={{ label: 'Browse campaigns', href: '/campaigns' }}
                    />
                </div>
            </DashboardLayout>
        );
    }

    if (!campaign) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto py-8">
                    <EmptyState
                        title="Campaign not found"
                        description="This campaign may have been deleted or doesn't exist."
                        action={{ label: 'Browse campaigns', href: '/campaigns' }}
                    />
                </div>
            </DashboardLayout>
        );
    }

    const currency = campaign.currency;
    const days = daysRemaining(campaign.endDate);
    const fundingProgress = clampPercent(campaign.fundingRaised, campaign.fundingGoal);

    const tabs: { id: TabId; label: string; icon: typeof TrendingUp; badge?: string }[] = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'investors', label: 'Investors', icon: Users, badge: campaign.currentInvestorCount > 0 ? String(campaign.currentInvestorCount) : undefined },
        { id: 'updates', label: 'Updates', icon: Megaphone, badge: updates.length > 0 ? String(updates.length) : undefined },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto py-8">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {actionError && (
                    <div role="alert" className="mb-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error">
                        {actionError}
                    </div>
                )}

                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    {/* Hero cover */}
                    <div className="relative aspect-[3/1] w-full overflow-hidden bg-muted">
                        {campaign.coverImageUrl ? (
                            <img src={campaign.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-6xl font-bold text-primary/30">
                                {campaign.title?.[0]?.toUpperCase() ?? '★'}
                            </div>
                        )}
                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                            <StatusBadge kind="campaign" status={campaign.status} dot pulse={campaign.status === 'active'} />
                            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                                {campaign.fundingType === 'split' ? 'Split Funding' : 'Pay Once'}
                            </span>
                        </div>
                    </div>

                    <div className="p-6 border-b border-border">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-foreground">{campaign.title}</h1>
                                {campaign.shortDescription && (
                                    <p className="text-muted-foreground mt-2 max-w-2xl">{campaign.shortDescription}</p>
                                )}
                            </div>

                            {campaign.status === 'active' && (
                                <Link
                                    to={`/campaigns/${campaign.id}/invest`}
                                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 flex items-center gap-2 font-semibold text-sm whitespace-nowrap transition-colors"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Invest Now
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-muted/30 border-b border-border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatTile label="Funding Goal" value={formatCompactCurrency(campaign.fundingGoal, { currency })} icon={Target} />
                            <StatTile
                                label="Raised"
                                value={formatCompactCurrency(campaign.fundingRaised, { currency })}
                                icon={Wallet}
                                hint={`${formatPercent(fundingProgress)} of goal`}
                            />
                            <StatTile label="Equity Offered" value={`${campaign.equityOfferedPct}%`} icon={PieChart} />
                            <StatTile label="Investors" value={`${campaign.currentInvestorCount}/${campaign.maxInvestors}`} icon={Users} />
                        </div>

                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground font-medium">{formatPercent(fundingProgress)} funded</span>
                                {campaign.endDate && (
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {days > 0 ? `${days} days left` : 'Ending soon'}
                                    </span>
                                )}
                            </div>
                            <ProgressBar value={fundingProgress} tone="emerald" size="lg" label={`${formatPercent(fundingProgress)} funded`} />
                        </div>
                    </div>

                    <div className="flex border-b border-border overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="font-medium">{tab.label}</span>
                                {tab.badge && (
                                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    {campaign.longDescription && (
                                        <div>
                                            <h2 className="text-sm font-bold text-foreground mb-3">About This Campaign</h2>
                                            <p className="text-muted-foreground bg-muted/30 p-4 rounded-xl whitespace-pre-wrap">
                                                {campaign.longDescription}
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <StatTile label="Pre-Money Valuation" value={formatCurrency(campaign.preMoneyValuation, { currency, maximumFractionDigits: 0 })} />
                                        <StatTile label="Min Investment" value={formatCurrency(campaign.minInvestment, { currency, maximumFractionDigits: 0 })} />
                                        <StatTile label="Platform Fee" value={`${campaign.platformFeePct}%`} />
                                        <StatTile label="Created" value={formatDate(campaign.createdAt)} />
                                    </div>

                                    {isOwner && campaign.status === 'draft' && (
                                        <div className="pt-4 border-t border-border flex flex-wrap gap-3">
                                            <Button
                                                onClick={handlePublish}
                                                disabled={actionLoading === 'publish'}
                                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                            >
                                                {actionLoading === 'publish' ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                                                ) : (
                                                    <><Play className="w-4 h-4" /> Publish Campaign</>
                                                )}
                                            </Button>
                                            <Button variant="outline" onClick={openEdit}>
                                                <Pencil className="w-4 h-4" /> Edit Details
                                            </Button>
                                            <Button variant="outline" onClick={handleCreateShareLink} disabled={actionLoading === 'share'}>
                                                {actionLoading === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                                Share
                                            </Button>
                                        </div>
                                    )}

                                    {isOwner && campaign.status === 'active' && (
                                        <div className="pt-4 border-t border-border flex flex-wrap gap-3">
                                            <Button variant="outline" onClick={handleCreateShareLink} disabled={actionLoading === 'share'}>
                                                {actionLoading === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                                Share
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => { setActionError(null); setCancelOpen(true); }}
                                            >
                                                <X className="w-4 h-4" /> Cancel Campaign
                                            </Button>
                                        </div>
                                    )}

                                    {shareLink && (
                                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                            <p className="text-sm font-semibold text-foreground mb-2">Share Link Created</p>
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="share-link" className="sr-only">Share link</label>
                                                <input
                                                    id="share-link"
                                                    type="text"
                                                    value={shareLink}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCopyLink}
                                                    aria-label="Copy share link"
                                                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1 transition-colors"
                                                >
                                                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'investors' && (
                                <motion.div
                                    key="investors"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {investors.length === 0 ? (
                                        <EmptyState
                                            icon={Users}
                                            title="No investors yet"
                                            description={
                                                campaign.status === 'active'
                                                    ? 'Share this campaign to attract investors.'
                                                    : 'Investors will appear here once the campaign is active.'
                                            }
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            <h2 className="text-sm font-bold text-foreground mb-4">Investors ({investors.length})</h2>
                                            {investors.map((investor) => (
                                                <div
                                                    key={investor.id}
                                                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
                                                            {investor.investorName?.[0]?.toUpperCase() ?? '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-foreground">{investor.investorName}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatDate(investor.investedAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-foreground">{formatCurrency(investor.amount, { currency, maximumFractionDigits: 0 })}</p>
                                                        <p className="text-xs text-muted-foreground">{formatPercent(investor.stakePct, { maximumFractionDigits: 3 })} stake</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'updates' && (
                                <motion.div
                                    key="updates"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    {updates.length === 0 ? (
                                        <EmptyState
                                            icon={Megaphone}
                                            title="No updates yet"
                                            description="The campaign owner has not posted any updates. Check back soon for progress reports."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {updates.map((update) => (
                                                <article key={update.id} className="rounded-xl border border-border bg-muted/30 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h3 className="font-semibold text-foreground">{update.title}</h3>
                                                        <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(update.createdAt)}</span>
                                                    </div>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{update.content}</p>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Cancel confirmation */}
            <ConfirmDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                title="Cancel this campaign?"
                description="This action cannot be undone. A reason is required for the audit history."
                confirmLabel="Cancel Campaign"
                cancelLabel="Keep Campaign"
                tone="danger"
                loading={actionLoading === 'cancel'}
                confirmDisabled={!cancelReason.trim()}
                onConfirm={handleCancel}
            >
                <label htmlFor="cancel-reason" className="mb-1.5 block text-sm font-medium text-foreground">
                    Cancellation reason
                </label>
                <textarea
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Explain why this campaign is being cancelled…"
                    rows={3}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-error/50"
                />
            </ConfirmDialog>

            {/* Edit draft details */}
            <Dialog open={editOpen} onOpenChange={actionLoading === 'edit' ? undefined : setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit campaign details</DialogTitle>
                        <DialogDescription>Update the public-facing details of your draft.</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="edit-title" className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
                            <input
                                id="edit-title"
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-short" className="mb-1.5 block text-sm font-medium text-foreground">Short description</label>
                            <input
                                id="edit-short"
                                type="text"
                                value={editForm.shortDescription}
                                onChange={(e) => setEditForm((f) => ({ ...f, shortDescription: e.target.value }))}
                                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-long" className="mb-1.5 block text-sm font-medium text-foreground">Full description</label>
                            <textarea
                                id="edit-long"
                                value={editForm.longDescription}
                                onChange={(e) => setEditForm((f) => ({ ...f, longDescription: e.target.value }))}
                                rows={5}
                                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={actionLoading === 'edit'}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditSave}
                            disabled={actionLoading === 'edit' || !editForm.title.trim()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {actionLoading === 'edit' && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};
