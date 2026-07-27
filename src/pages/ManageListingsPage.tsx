import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    Plus, Eye, Bookmark, DollarSign, TrendingUp, MoreVertical,
    Pause, Play, Edit, Trash2, ExternalLink,
    ShieldCheck, ImageIcon,
} from 'lucide-react';
import { useMarketplace } from '../hooks/useMarketplace';
import { useOffers, Offer } from '../hooks/useOffers';
import { Link, useNavigate } from 'react-router-dom';
import { OffersTable } from '../components/OffersTable';
import { Listing, ListingStatus } from '../../../../packages/types/src';
import { StatusBadge, StatTile, LoadingState, EmptyState } from '../components/ui';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatCompactCurrency, formatNumber } from '../utils/format';

type MarketplaceActions = ReturnType<typeof useMarketplace> & {
    submitListingForReview?: (listingId: string) => Promise<{ success?: boolean; data?: { data?: Listing } }>;
};

const REVIEW_LOCKED_STATUSES: ListingStatus[] = ['pending_review', 'under_review'];
const SUBMITTABLE_STATUSES: ListingStatus[] = ['draft', 'rejected'];

const APPROVAL_STAGES = [
    { id: 'awaiting_technical', label: 'Technical Audit' },
    { id: 'awaiting_financial', label: 'Financial Audit' },
    { id: 'approved', label: 'Final Approval' },
];

const LISTING_FILTERS = ['all', 'active', 'paused', 'sold', 'draft', 'pending_review', 'under_review', 'rejected'];

export const ManageListingsPage: React.FC = () => {
    const [view, setView] = useState<'listings' | 'offers'>('listings');
    const [filter, setFilter] = useState<string>('all');
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [offerCount, setOfferCount] = useState(0);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    const marketplace = useMarketplace() as MarketplaceActions;
    const { getMyListings, updateListingStatus, deleteListing, isLoading: loadingListings } = marketplace;
    const { getMyReceivedOffers } = useOffers();

    useEffect(() => {
        fetchMyData();
    }, []);

    // Close the action menu on outside click or Escape.
    useEffect(() => {
        if (!openMenu) return;
        const handlePointer = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenMenu(null);
        };
        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [openMenu]);

    const fetchMyData = async () => {
        const result = await getMyListings();
        if (result.success && result.data) {
            setListings(result.data.data);
        }
        // Single request instead of an N+1 per-listing loop.
        const offersResult = await getMyReceivedOffers();
        if (offersResult?.success && offersResult.data) {
            setOfferCount((offersResult.data as Offer[]).length);
        }
    };

    const filteredListings = listings.filter((l) => filter === 'all' || l.status === filter);

    const totalViews = listings.reduce((acc, l) => acc + (l.viewsCount || 0), 0);
    const totalSaves = listings.reduce((acc, l) => acc + (l.savesCount || 0), 0);
    const activeCount = listings.filter((l) => l.status === 'active').length;

    const handleEditListing = (listingId: string) => {
        setOpenMenu(null);
        navigate(`/listings/${listingId}/edit`);
    };

    const handleSubmitForReview = async (listingId: string) => {
        if (typeof marketplace.submitListingForReview !== 'function') return;
        setActionLoading(listingId);
        const result = await marketplace.submitListingForReview(listingId);
        if (result?.success) {
            setListings((prev) =>
                prev.map((l) =>
                    l.id === listingId
                        ? { ...l, ...(result.data?.data || {}), status: (result.data?.data?.status || 'pending_review') as ListingStatus }
                        : l,
                ),
            );
        }
        setActionLoading(null);
        setOpenMenu(null);
    };

    const handleToggleStatus = async (listingId: string, currentStatus: string) => {
        setActionLoading(listingId);
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        const result = await updateListingStatus(listingId, newStatus as any);
        if (result.success) {
            setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status: newStatus as ListingStatus } : l)));
        }
        setActionLoading(null);
        setOpenMenu(null);
    };

    const handleDeleteListing = async (listingId: string) => {
        setActionLoading(listingId);
        const result = await deleteListing(listingId);
        if (result.success) {
            setListings((prev) => prev.filter((l) => l.id !== listingId));
            setDeleteConfirm(null);
        }
        setActionLoading(null);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Seller Control Center</h1>
                        <p className="text-muted-foreground">Manage your assets, monitor offers, and track growth.</p>
                    </div>
                    <Link
                        to="/listings/new"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Plus size={18} />
                        Create Listing
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <StatTile label="Total Views" value={formatNumber(totalViews)} icon={Eye} variant="card" />
                    <StatTile label="Total Saves" value={formatNumber(totalSaves)} icon={Bookmark} variant="card" />
                    <StatTile label="Total Offers" value={formatNumber(offerCount)} icon={DollarSign} variant="card" />
                    <StatTile label="Active Listings" value={formatNumber(activeCount)} icon={TrendingUp} variant="card" />
                </div>

                {/* View Switcher */}
                <div className="flex border-b border-border" role="tablist">
                    <button
                        role="tab"
                        aria-selected={view === 'listings'}
                        onClick={() => setView('listings')}
                        className={`border-b-2 px-8 py-4 text-sm font-semibold transition-all ${
                            view === 'listings' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        My Listings ({listings.length})
                    </button>
                    <button
                        role="tab"
                        aria-selected={view === 'offers'}
                        onClick={() => setView('offers')}
                        className={`border-b-2 px-8 py-4 text-sm font-semibold transition-all ${
                            view === 'offers' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Received Offers ({offerCount})
                    </button>
                </div>

                {view === 'listings' ? (
                    <div className="min-h-[400px] overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border p-6">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {LISTING_FILTERS.map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                                            filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                        }`}
                                    >
                                        {f.split('_').join(' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-border">
                            {loadingListings && listings.length === 0 ? (
                                <div className="p-6">
                                    <LoadingState title="Syncing with marketplace..." variant="skeleton" rows={4} />
                                </div>
                            ) : filteredListings.length > 0 ? (
                                filteredListings.map((listing) => {
                                    const editLocked = REVIEW_LOCKED_STATUSES.includes(listing.status);
                                    const canSubmitForReview = SUBMITTABLE_STATUSES.includes(listing.status);
                                    const hasSubmitForReview = typeof marketplace.submitListingForReview === 'function';
                                    const menuOpen = openMenu === listing.id;
                                    return (
                                        <div key={listing.id} className="group p-6 transition-all hover:bg-muted/40 md:p-8">
                                            <div className="flex flex-col gap-6 md:flex-row md:items-start">
                                                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
                                                    {listing.imageUrl ? (
                                                        <img src={listing.imageUrl} alt={listing.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                            <ImageIcon size={28} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1 space-y-4">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h3 className="text-lg font-bold tracking-tight text-foreground">{listing.name}</h3>
                                                        <StatusBadge kind="listing" status={listing.status} dot pulse={listing.status === 'active'} />
                                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                                                            <ShieldCheck size={12} className={(listing.trustScore || 0) >= 80 ? 'text-emerald-500' : 'text-amber-500'} />
                                                            <span className="text-[11px] font-bold text-foreground">{listing.trustScore || 0}% Trust</span>
                                                        </div>
                                                    </div>

                                                    {editLocked && (
                                                        <div className="space-y-3 rounded-2xl border border-border bg-muted p-4">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Review Lock Active</p>
                                                                <span className="text-[10px] font-bold uppercase text-primary">
                                                                    Stage: {listing.approvalStage?.replace('_', ' ') || listing.status.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs font-medium text-muted-foreground">Editing is locked while marketplace review is in progress.</p>
                                                            <div className="flex gap-2">
                                                                {APPROVAL_STAGES.map((stage) => {
                                                                    const currentIdx = APPROVAL_STAGES.findIndex((s) => s.id === listing.approvalStage);
                                                                    const idx = APPROVAL_STAGES.findIndex((s) => s.id === stage.id);
                                                                    const isCompleted = idx < currentIdx;
                                                                    const isCurrent = stage.id === listing.approvalStage;
                                                                    return (
                                                                        <div key={stage.id} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                                                                            <div className={`absolute inset-0 transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : isCurrent ? 'animate-pulse bg-primary' : ''}`} />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-6">
                                                        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                                            <Eye size={14} /> {formatNumber(listing.viewsCount || 0)} views
                                                        </span>
                                                        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                                            <Bookmark size={14} /> {formatNumber(listing.savesCount || 0)} saves
                                                        </span>
                                                        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                                            <DollarSign size={14} /> {formatNumber(listing.offersCount || 0)} offers
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                                                    <div className="text-right">
                                                        <p className="text-xl font-bold text-foreground">
                                                            {formatCompactCurrency(listing.askingPrice || listing.targetRaise || 0)}
                                                        </p>
                                                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {formatCompactCurrency(listing.monthlyRevenue || 0)}/mo
                                                        </p>
                                                    </div>

                                                    <div className="relative" ref={menuOpen ? menuRef : undefined}>
                                                        <button
                                                            onClick={() => setOpenMenu(menuOpen ? null : listing.id)}
                                                            aria-label={`Actions for ${listing.name}`}
                                                            aria-haspopup="menu"
                                                            aria-expanded={menuOpen}
                                                            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        >
                                                            <MoreVertical size={20} />
                                                        </button>

                                                        {menuOpen && (
                                                            <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-card py-2 shadow-lg">
                                                                <button
                                                                    role="menuitem"
                                                                    onClick={() => !editLocked && handleEditListing(listing.id)}
                                                                    disabled={editLocked}
                                                                    title={editLocked ? 'Editing is locked while this listing is in review.' : 'Edit listing'}
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    <Edit size={16} /> {editLocked ? 'Edit Locked' : 'Edit Listing'}
                                                                </button>
                                                                {canSubmitForReview && (
                                                                    <button
                                                                        role="menuitem"
                                                                        onClick={() => handleSubmitForReview(listing.id)}
                                                                        disabled={!hasSubmitForReview || actionLoading === listing.id}
                                                                        title={hasSubmitForReview ? 'Submit this listing for marketplace review.' : 'Submit-for-review is not available yet.'}
                                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        <ShieldCheck size={16} /> Submit for Review
                                                                    </button>
                                                                )}
                                                                <Link
                                                                    role="menuitem"
                                                                    to={`/listings/${listing.id}`}
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted"
                                                                    onClick={() => setOpenMenu(null)}
                                                                >
                                                                    <ExternalLink size={16} /> View Public
                                                                </Link>
                                                                <button
                                                                    role="menuitem"
                                                                    onClick={() => handleToggleStatus(listing.id, listing.status)}
                                                                    disabled={actionLoading === listing.id || editLocked || listing.status === 'rejected'}
                                                                    title={editLocked ? 'Status changes are locked during review.' : listing.status === 'rejected' ? 'Rejected listings must be edited and resubmitted.' : 'Change listing status'}
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                                                                >
                                                                    {listing.status === 'active' ? (
                                                                        <><Pause size={16} /> Pause Listing</>
                                                                    ) : (
                                                                        <><Play size={16} /> Activate Listing</>
                                                                    )}
                                                                </button>
                                                                <div className="my-2 border-t border-border" />
                                                                <button
                                                                    role="menuitem"
                                                                    onClick={() => {
                                                                        setOpenMenu(null);
                                                                        setDeleteConfirm(listing.id);
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-error hover:bg-error/10"
                                                                >
                                                                    <Trash2 size={16} /> Delete Listing
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-6">
                                    <EmptyState
                                        icon={Plus}
                                        size="lg"
                                        title="No active listings"
                                        description="Ready to exit? List your app and reach thousands of verified buyers."
                                        action={{ label: 'List My First App', href: '/listings/new', icon: Plus }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <OffersTable />
                )}

                <ConfirmDialog
                    open={!!deleteConfirm}
                    onOpenChange={(open) => !open && setDeleteConfirm(null)}
                    title="Delete listing?"
                    description="Your listing will be permanently removed from the marketplace. Any pending offers will be automatically declined. This action cannot be undone."
                    confirmLabel="Delete Listing"
                    tone="danger"
                    loading={!!deleteConfirm && actionLoading === deleteConfirm}
                    onConfirm={() => deleteConfirm && handleDeleteListing(deleteConfirm)}
                />
            </div>
        </DashboardLayout>
    );
};
