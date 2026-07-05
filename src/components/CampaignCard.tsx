import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, ArrowUpRight, Clock } from 'lucide-react';
import { CrowdfundingCampaign } from '../hooks/useCrowdfundingSupabase';
import { formatCompactCurrency, clampPercent, daysRemaining, formatPercent } from '../utils/format';
import { cn } from '../utils/cn';
import { StatusBadge } from './ui/StatusBadge';
import { ProgressBar } from './ui/ProgressBar';

interface CampaignCardProps {
    campaign: CrowdfundingCampaign;
    variant?: 'grid' | 'list';
    /** Whether the current user watches this campaign. */
    isWatched?: boolean;
    /** Toggle watchlist; when omitted the heart button is hidden. */
    onToggleWatch?: (campaignId: string) => void;
    className?: string;
}

/**
 * Canonical crowdfunding campaign card. Replaces the five bespoke campaign
 * renderers across InvestPage, BrowseCampaignsPage (grid + list), and
 * MyCampaignsPage. NGN-aware via the campaign's own `currency` field.
 */
export const CampaignCard: React.FC<CampaignCardProps> = ({
    campaign,
    variant = 'grid',
    isWatched = false,
    onToggleWatch,
    className,
}) => {
    const currency = campaign.currency;
    const progress = clampPercent(campaign.fundingRaised, campaign.fundingGoal);
    const days = daysRemaining(campaign.endDate);
    const detailHref = `/campaigns/${campaign.id}`;

    const WatchButton = onToggleWatch ? (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWatch(campaign.id);
            }}
            aria-pressed={isWatched}
            aria-label={isWatched ? `Unwatch ${campaign.title}` : `Watch ${campaign.title}`}
            className={cn(
                'absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isWatched ? 'bg-primary text-primary-foreground' : 'bg-black/40 text-white hover:bg-black/60',
            )}
        >
            <Heart className="h-4 w-4" fill={isWatched ? 'currentColor' : 'none'} />
        </button>
    ) : null;

    const Cover = (
        <div
            className={cn(
                'relative overflow-hidden bg-muted',
                variant === 'grid' ? 'aspect-[16/9] w-full' : 'aspect-[16/10] w-full sm:aspect-auto sm:w-2/5',
            )}
        >
            {campaign.coverImageUrl ? (
                <img
                    src={campaign.coverImageUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            ) : (
                <div className="flex h-full min-h-[8rem] w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-4xl font-bold text-primary/40">
                    {campaign.title?.[0]?.toUpperCase() ?? '★'}
                </div>
            )}
            <div className="absolute left-3 top-3">
                <StatusBadge kind="campaign" status={campaign.status} dot pulse={campaign.status === 'active'} />
            </div>
        </div>
    );

    const Body = (
        <div className="flex flex-1 flex-col p-5">
            <h3 className="line-clamp-1 text-lg font-bold text-foreground">
                <Link to={detailHref} aria-label={`View ${campaign.title}`} className="after:absolute after:inset-0 focus:outline-none">
                    {campaign.title}
                </Link>
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {campaign.shortDescription || campaign.longDescription?.slice(0, 140)}
            </p>

            <div className="mt-4 space-y-2">
                <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-foreground">
                        {formatCompactCurrency(campaign.fundingRaised, { currency })}
                    </span>
                    <span className="text-sm font-semibold text-primary">{formatPercent(progress)}</span>
                </div>
                <ProgressBar value={progress} label={`${formatPercent(progress)} funded`} />
                <p className="text-xs text-muted-foreground">
                    of {formatCompactCurrency(campaign.fundingGoal, { currency })} goal
                </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden="true" /> {campaign.currentInvestorCount} investors
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400">{campaign.equityOfferedPct}%</span> equity
                </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {campaign.status === 'active' ? (days > 0 ? `${days} days left` : 'Ending soon') : `Min ${formatCompactCurrency(campaign.minInvestment, { currency })}`}
                </span>
                <span className="relative z-10 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:gap-1.5">
                    View <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>
        </div>
    );

    return (
        <article
            className={cn(
                'group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300',
                'hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-ring',
                variant === 'grid' ? 'flex h-full flex-col' : 'flex flex-col sm:flex-row',
                className,
            )}
        >
            {Cover}
            {Body}
            {WatchButton}
        </article>
    );
};
