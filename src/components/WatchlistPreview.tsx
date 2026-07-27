import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Sparkles } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { ListingCard } from './ListingCard';
import { Skeleton } from './ui';

export const WatchlistPreview: React.FC = () => {
    const { watchlist, isLoading } = useWatchlist();

    if (isLoading) {
        return (
            <section className="space-y-8">
                <div className="flex items-center gap-3 px-4">
                    <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                        <Bookmark size={20} fill="currentColor" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Your watchlist</h2>
                        <p className="text-xs font-medium text-muted-foreground">Items you're keeping an eye on</p>
                    </div>
                </div>
                <div className="flex gap-8 overflow-x-auto px-4 pb-8">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[380px] min-w-[320px] rounded-2xl md:min-w-[380px]" />
                    ))}
                </div>
            </section>
        );
    }

    if (watchlist.length === 0) {
        return null;
    }

    return (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                        <Bookmark size={20} fill="currentColor" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Your watchlist</h2>
                        <p className="text-xs font-medium text-muted-foreground">Items you're keeping an eye on</p>
                    </div>
                </div>
                <Link
                    to="/watchlist"
                    className="group flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    See more <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
            </div>

            <div className="flex gap-8 overflow-x-auto px-4 pb-8 snap-x snap-mandatory scrollbar-hide">
                {watchlist.map((item) => (
                    <div key={item.id} className="min-w-[320px] snap-start md:min-w-[380px]">
                        {item.listing && <ListingCard listing={item.listing} showWatchlist />}
                    </div>
                ))}

                <Link
                    to="/watchlist"
                    className="flex min-w-[200px] snap-start flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted transition-all hover:border-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group/card"
                >
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border text-muted-foreground transition-all group-hover/card:scale-110 group-hover/card:text-primary">
                        <Sparkles size={24} />
                    </div>
                    <span className="text-sm font-bold text-foreground">View entire list</span>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {watchlist.length} listings
                    </span>
                </Link>
            </div>
        </section>
    );
};
