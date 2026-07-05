import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { useWatchlist } from '../hooks/useWatchlist';
import { ListingCard } from '../components/ListingCard';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, Filter, Search, ShoppingBag, X } from 'lucide-react';
import { Skeleton, EmptyState, ErrorState, Select } from '../components/ui';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Watching' },
    { value: 'paused', label: 'Paused' },
    { value: 'sold', label: 'Sold' },
    { value: 'unavailable', label: 'Unavailable' },
];

const getItemStatus = (item: Record<string, unknown>) => {
    const directStatus = typeof item.status === 'string' ? item.status : undefined;
    const listing = item.listing && typeof item.listing === 'object' ? (item.listing as Record<string, unknown>) : null;
    const listingStatus = typeof listing?.status === 'string' ? listing.status : undefined;
    return directStatus || listingStatus || 'active';
};

export const WatchlistPage: React.FC = () => {
    const { watchlist, isLoading, error, removeFromWatchlist, updateWatchlistItem, refreshWatchlist } = useWatchlist();
    const [statusFilter, setStatusFilter] = useState('all');
    const [notesFilter, setNotesFilter] = useState<'all' | 'with_notes'>('all');
    const [query, setQuery] = useState('');
    const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
    const [savingItemId, setSavingItemId] = useState<string | null>(null);

    const statusOptions = useMemo(() => {
        const values = new Set(watchlist.map((item) => getItemStatus(item as unknown as Record<string, unknown>)));
        return ['all', ...Array.from(values)];
    }, [watchlist]);

    const filteredWatchlist = useMemo(() => {
        return watchlist.filter((item) => {
            const record = item as unknown as Record<string, unknown>;
            const listing = item.listing;
            const status = getItemStatus(record);
            const notes = typeof record.notes === 'string' ? record.notes : '';
            const searchable = `${listing?.name || ''} ${listing?.category || ''} ${notes}`.toLowerCase();

            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            const matchesNotes = notesFilter === 'all' || notes.trim().length > 0;
            const matchesQuery = !query.trim() || searchable.includes(query.trim().toLowerCase());

            return matchesStatus && matchesNotes && matchesQuery;
        });
    }, [watchlist, statusFilter, notesFilter, query]);

    const handleRemove = async (listingId: string) => {
        await removeFromWatchlist(listingId);
    };

    const handleSaveNote = async (listingId: string, itemId: string) => {
        setSavingItemId(itemId);
        await updateWatchlistItem(listingId, { notes: draftNotes[itemId] ?? '' });
        setSavingItemId(null);
    };

    const handleStatusChange = async (listingId: string, status: string) => {
        await updateWatchlistItem(listingId, { status: status as 'active' | 'paused' | 'sold' | 'unavailable' });
    };

    return (
        <Layout>
            <div className="space-y-10 pb-20">
                <div className="flex flex-col justify-between gap-6 pt-12 md:flex-row md:items-end">
                    <div className="space-y-4">
                        <Link to="/marketplace" className="group inline-flex items-center gap-2 font-bold text-muted-foreground transition-colors hover:text-primary">
                            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                            Back to Marketplace
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4 text-primary shadow-sm">
                                <Bookmark size={32} fill="currentColor" />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">My Watchlist</h1>
                        </div>
                        <p className="max-w-xl text-lg font-medium text-muted-foreground">
                            Track saved marketplace listings, review notes, and monitor listing status changes from your account.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-border bg-card px-6 py-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Saved listings</p>
                        <p className="text-2xl font-bold text-foreground">{watchlist.length}</p>
                    </div>
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-4 lg:flex-row lg:items-center">
                    <div className="relative max-w-xl flex-1">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search saved listings..."
                            aria-label="Search saved listings"
                            className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-muted-foreground">
                            <Filter size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
                        </div>
                        {statusOptions.map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                                    statusFilter === status
                                        ? 'bg-primary text-primary-foreground'
                                        : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                        <button
                            onClick={() => setNotesFilter(notesFilter === 'with_notes' ? 'all' : 'with_notes')}
                            className={`rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                                notesFilter === 'with_notes'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            With notes
                        </button>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-[460px] w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <ErrorState
                            title="Could not load your watchlist"
                            description="Something went wrong while fetching your saved listings."
                            detail={error}
                            action={{ label: 'Try again', onClick: () => refreshWatchlist() }}
                        />
                    ) : filteredWatchlist.length > 0 ? (
                        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
                            {filteredWatchlist.map((item) => {
                                const record = item as unknown as Record<string, unknown>;
                                const status = getItemStatus(record);
                                const notes = typeof record.notes === 'string' ? record.notes : '';
                                return (
                                    <div key={item.id} className="space-y-3">
                                        <div className="relative">
                                            {item.listing && <ListingCard listing={item.listing} showWatchlist />}
                                            <button
                                                onClick={() => handleRemove(item.listingId)}
                                                className="absolute right-4 top-4 z-20 rounded-2xl bg-card/90 p-3 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-card hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                aria-label="Remove from watchlist"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                    Watch status
                                                </span>
                                                <div className="w-36">
                                                    <Select
                                                        aria-label="Watch status"
                                                        value={STATUS_OPTIONS.some((o) => o.value === status) ? status : 'active'}
                                                        onValueChange={(next) => handleStatusChange(item.listingId, next)}
                                                        options={STATUS_OPTIONS}
                                                        placeholder=""
                                                        size="sm"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                value={draftNotes[item.id] ?? notes}
                                                onChange={(event) =>
                                                    setDraftNotes((prev) => ({ ...prev, [item.id]: event.target.value }))
                                                }
                                                rows={3}
                                                aria-label="Private notes"
                                                placeholder="Add private notes..."
                                                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <button
                                                onClick={() => handleSaveNote(item.listingId, item.id)}
                                                disabled={savingItemId === item.id}
                                                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                            >
                                                {savingItemId === item.id ? 'Saving...' : 'Save note'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Bookmark}
                            size="lg"
                            title="No saved listings found"
                            description="Save listings from the marketplace or adjust your filters to see more results."
                            action={{ label: 'Explore Marketplace', href: '/marketplace', icon: ShoppingBag }}
                        />
                    )}
                </div>

                {watchlist.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-8 rounded-2xl border border-border bg-muted p-10 md:flex-row">
                        <div className="space-y-2 text-center md:text-left">
                            <h3 className="text-xl font-bold text-foreground">Watchlist tracking</h3>
                            <p className="font-medium text-muted-foreground">
                                Saved listing updates, notes, and statuses are shown from the active watchlist source.
                            </p>
                        </div>
                        <Link
                            to="/settings"
                            className="rounded-2xl border border-border bg-card px-8 py-4 font-bold text-foreground shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Notification Settings
                        </Link>
                    </div>
                )}
            </div>
        </Layout>
    );
};
