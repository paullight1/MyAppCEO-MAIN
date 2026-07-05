import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { WatchlistItem, AppListing } from '../types';
import { apiDelete, apiGetAuth, apiPatch, apiPost, getAuthToken } from '../lib/apiClient';

const STORAGE_KEY = 'mvplab_watchlist_v1';
const MIGRATION_KEY = 'mvplab_watchlist_migrated_v1';

type WatchlistStatusFilter = 'all' | 'active' | 'paused' | 'sold' | 'unavailable';

type ServerWatchlistItem = WatchlistItem & {
    status?: Exclude<WatchlistStatusFilter, 'all'>;
    priceChanged?: boolean;
    listingStatus?: string;
};

interface WatchlistMutationResult<T = ServerWatchlistItem> {
    success: boolean;
    data?: T;
    error?: string;
    offline?: boolean;
}

const readLocalWatchlist = (): ServerWatchlistItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('MVPLAB Watchlist: failed to load local fallback', error);
        return [];
    }
};

const persistLocalWatchlist = (updatedList: ServerWatchlistItem[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (error) {
        console.error('MVPLAB Watchlist: failed to persist local fallback', error);
    }
};

const createFallbackItem = (
    listing: AppListing,
    notes?: string,
): ServerWatchlistItem => ({
    id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    listingId: listing.id,
    addedAt: new Date().toISOString(),
    notes,
    status: listing.status === 'active' ? 'active' : 'unavailable',
    listing,
});

const mergeWatchlists = (
    serverItems: ServerWatchlistItem[],
    localItems: ServerWatchlistItem[],
) => {
    const byListingId = new Map<string, ServerWatchlistItem>();
    [...localItems, ...serverItems].forEach((item) => {
        byListingId.set(item.listingId, {
            ...byListingId.get(item.listingId),
            ...item,
            listing: item.listing || byListingId.get(item.listingId)?.listing,
        });
    });
    return Array.from(byListingId.values()).sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    );
};

export const useWatchlist = (initialStatusFilter: WatchlistStatusFilter = 'all') => {
    const [watchlist, setWatchlist] = useState<ServerWatchlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isServerBacked, setIsServerBacked] = useState(false);
    const [statusFilter, setStatusFilter] = useState<WatchlistStatusFilter>(initialStatusFilter);

    const applyAndPersist = useCallback((items: ServerWatchlistItem[]) => {
        setWatchlist(items);
        persistLocalWatchlist(items);
    }, []);

    const migrateLocalItems = useCallback(async (localItems: ServerWatchlistItem[]) => {
        if (localItems.length === 0 || localStorage.getItem(MIGRATION_KEY) === 'true') {
            return;
        }

        await Promise.allSettled(
            localItems.map((item) =>
                apiPost<ApiResponse<ServerWatchlistItem>>('/watchlist', {
                    listingId: item.listingId,
                    notes: item.notes,
                    source: 'local_storage_migration',
                }),
            ),
        );
        localStorage.setItem(MIGRATION_KEY, 'true');
    }, []);

    const loadWatchlist = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const localItems = readLocalWatchlist();
        setWatchlist(localItems);

        const token = await getAuthToken();
        if (!token) {
            setIsServerBacked(false);
            setIsLoading(false);
            return;
        }

        try {
            await migrateLocalItems(localItems);
            const query = statusFilter === 'all' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
            const response = await apiGetAuth<ApiResponse<ServerWatchlistItem[]>>(`/watchlist${query}`);
            const merged = mergeWatchlists(response.data || [], localItems);
            applyAndPersist(merged);
            setIsServerBacked(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to sync watchlist';
            setError(message);
            setIsServerBacked(false);
            applyAndPersist(localItems);
        } finally {
            setIsLoading(false);
        }
    }, [applyAndPersist, migrateLocalItems, statusFilter]);

    useEffect(() => {
        loadWatchlist();
    }, [loadWatchlist]);

    const filteredWatchlist = watchlist.filter((item) => {
        if (statusFilter === 'all') return true;
        return item.status === statusFilter || item.listing?.status === statusFilter;
    });

    const addToWatchlist = useCallback(async (listing: AppListing, notes?: string): Promise<WatchlistMutationResult> => {
        const existing = watchlist.find((item) => item.listingId === listing.id);
        if (existing) return { success: true, data: existing };

        const fallbackItem = createFallbackItem(listing, notes);
        const optimistic = [...watchlist, fallbackItem];
        applyAndPersist(optimistic);

        const token = await getAuthToken();
        if (!token) {
            return { success: true, data: fallbackItem, offline: true };
        }

        try {
            const response = await apiPost<ApiResponse<ServerWatchlistItem>>('/watchlist', {
                listingId: listing.id,
                notes,
            });
            const synced = optimistic.map((item) =>
                item.listingId === listing.id ? { ...fallbackItem, ...response.data } : item,
            );
            applyAndPersist(synced);
            setIsServerBacked(true);
            return { success: true, data: response.data };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save watchlist item';
            setError(message);
            return { success: true, data: fallbackItem, error: message, offline: true };
        }
    }, [applyAndPersist, watchlist]);

    const removeFromWatchlist = useCallback(async (listingId: string): Promise<WatchlistMutationResult<{ listingId: string }>> => {
        const previous = watchlist;
        const updated = previous.filter((item) => item.listingId !== listingId);
        applyAndPersist(updated);

        const token = await getAuthToken();
        if (!token) {
            return { success: true, data: { listingId }, offline: true };
        }

        try {
            await apiDelete<ApiResponse<{ listingId: string }>>(`/watchlist/${listingId}`);
            setIsServerBacked(true);
            return { success: true, data: { listingId } };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to remove watchlist item';
            setError(message);
            applyAndPersist(previous);
            return { success: false, data: { listingId }, error: message };
        }
    }, [applyAndPersist, watchlist]);

    const updateWatchlistItem = useCallback(async (
        listingId: string,
        updates: Pick<Partial<ServerWatchlistItem>, 'notes' | 'status'>,
    ): Promise<WatchlistMutationResult> => {
        const previous = watchlist;
        const updated = previous.map((item) =>
            item.listingId === listingId ? { ...item, ...updates } : item,
        );
        applyAndPersist(updated);

        const token = await getAuthToken();
        if (!token) {
            const localItem = updated.find((item) => item.listingId === listingId);
            return { success: true, data: localItem, offline: true };
        }

        try {
            const response = await apiPatch<ApiResponse<ServerWatchlistItem>>(
                `/watchlist/${listingId}`,
                updates,
            );
            applyAndPersist(
                updated.map((item) =>
                    item.listingId === listingId ? { ...item, ...response.data } : item,
                ),
            );
            setIsServerBacked(true);
            return { success: true, data: response.data };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to update watchlist item';
            setError(message);
            applyAndPersist(previous);
            return { success: false, error: message };
        }
    }, [applyAndPersist, watchlist]);

    const isInWatchlist = useCallback((listingId: string) => {
        return watchlist.some((item) => item.listingId === listingId);
    }, [watchlist]);

    return {
        watchlist: filteredWatchlist,
        allWatchlistItems: watchlist,
        isLoading,
        error,
        isServerBacked,
        statusFilter,
        setStatusFilter,
        refreshWatchlist: loadWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        updateWatchlistItem,
        isInWatchlist,
    };
};
