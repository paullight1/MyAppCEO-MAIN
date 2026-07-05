import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Bookmark, TrendingUp, ImageOff } from 'lucide-react';
import { AppListing } from '../types';
import { useWatchlist } from '../hooks/useWatchlist';
import { formatCompactCurrency } from '../utils/format';
import { cn } from '../utils/cn';

interface ListingCardProps {
    listing: AppListing;
    /** Destination for the card link. Defaults to the listing detail route. */
    href?: string;
    /** Show the bookmark/watchlist toggle (default true). */
    showWatchlist?: boolean;
    className?: string;
}

const isInvestment = (l: AppListing) => l.listingType === 'investment' || l.listingType === 'both';

/**
 * The single canonical marketplace listing card — token-based, dark-mode aware,
 * accessible. Replaces the rose/no-dark-mode card and the inline card that was
 * duplicated inside MarketplacePage. Uses the "sibling overlay" pattern so the
 * whole card links to the detail page while the watchlist button stays a
 * separate, keyboard-reachable control (no nested interactive elements).
 */
export const ListingCard: React.FC<ListingCardProps> = ({
    listing,
    href = `/listings/${listing.id}`,
    showWatchlist = true,
    className,
}) => {
    const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const [imgFailed, setImgFailed] = useState(false);
    const isWatchlisted = isInWatchlist(listing.id);
    const currency = (listing as { currency?: string }).currency;

    const handleWatchlistToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isWatchlisted) removeFromWatchlist(listing.id);
        else addToWatchlist(listing);
    };

    const primaryLabel = listing.listingType === 'sale' ? 'Asking price' : 'Target raise';
    const primaryValue =
        listing.listingType === 'sale'
            ? listing.askingPrice != null
                ? formatCompactCurrency(listing.askingPrice, { currency })
                : 'Contact'
            : listing.targetRaise != null
              ? formatCompactCurrency(listing.targetRaise, { currency })
              : 'Contact';

    return (
        <article
            className={cn(
                'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
                'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-ring',
                className,
            )}
        >
            {/* Media */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                {listing.imageUrl && !imgFailed ? (
                    <img
                        src={listing.imageUrl}
                        alt=""
                        loading="lazy"
                        onError={() => setImgFailed(true)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-8 w-8" aria-hidden="true" />
                    </div>
                )}
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                        {listing.category}
                    </span>
                    {isInvestment(listing) && listing.projectedApy != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                            <TrendingUp className="h-3 w-3" aria-hidden="true" /> {listing.projectedApy}% yield
                        </span>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-1 text-lg font-bold text-foreground">
                    {/* Stretched link: covers the whole card without wrapping the button */}
                    <Link to={href} aria-label={`View ${listing.name}`} className="after:absolute after:inset-0 focus:outline-none">
                        {listing.name}
                    </Link>
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {listing.shortDescription}
                </p>

                <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{primaryLabel}</p>
                        <p className="text-xl font-bold text-foreground">{primaryValue}</p>
                        {isInvestment(listing) && listing.equityAvailable != null && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{listing.equityAvailable}% equity</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">MRR</p>
                        <div className="flex items-center justify-end gap-1">
                            <span className={cn('text-base font-bold', listing.monthlyRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                                {listing.monthlyRevenue ? formatCompactCurrency(listing.monthlyRevenue, { currency }) : 'N/A'}
                            </span>
                            {listing.revenueVerified && listing.monthlyRevenue ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Revenue verified" />
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {/* Watchlist toggle — sibling of the link, above the stretched overlay */}
            {showWatchlist && (
                <button
                    type="button"
                    onClick={handleWatchlistToggle}
                    aria-pressed={isWatchlisted}
                    aria-label={isWatchlisted ? `Remove ${listing.name} from watchlist` : `Save ${listing.name} to watchlist`}
                    className={cn(
                        'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                        isWatchlisted ? 'bg-primary text-primary-foreground' : 'bg-black/40 text-white hover:bg-black/60',
                    )}
                >
                    <Bookmark className="h-4 w-4" fill={isWatchlisted ? 'currentColor' : 'none'} />
                </button>
            )}
        </article>
    );
};
