import React from 'react';
import { Award, Crown, LucideIcon, Medal, Sparkles, Star, Trophy } from 'lucide-react';
import { cn } from './cn';

/**
 * Shared community-recognition helpers.
 *
 * Previously `getRankIcon` / `getReputationLevel` and the inline verified-check
 * SVG were duplicated across CommunityStarsPage and CommunityProfilePage. This
 * module is the single source of truth.
 */

export interface RankMeta {
    Icon: LucideIcon;
    /** text-* colour class */
    color: string;
    /** bg-* colour class for the rank chip */
    bg: string;
}

/** Leaderboard rank styling. Ranks 1–3 get medal iconography; others fall back. */
export function getRankMeta(rank: number): RankMeta {
    if (rank === 1) return { Icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/15' };
    if (rank === 2) return { Icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/15' };
    if (rank === 3) return { Icon: Trophy, color: 'text-amber-700 dark:text-amber-600', bg: 'bg-amber-700/15' };
    return { Icon: Star, color: 'text-muted-foreground', bg: 'bg-muted' };
}

export interface ReputationLevel {
    name: string;
    Icon: LucideIcon;
    color: string;
    /** Inclusive lower bound of reputation for this level. */
    threshold: number;
}

const REPUTATION_LEVELS: ReputationLevel[] = [
    { name: 'Community Star', Icon: Crown, color: 'text-amber-500', threshold: 1000 },
    { name: 'Trusted Member', Icon: Star, color: 'text-violet-500', threshold: 500 },
    { name: 'Active Member', Icon: Sparkles, color: 'text-primary', threshold: 200 },
    { name: 'Contributor', Icon: Award, color: 'text-emerald-500', threshold: 50 },
    { name: 'New Member', Icon: Star, color: 'text-muted-foreground', threshold: 0 },
];

/** Map a reputation score to its named level. */
export function getReputationLevel(reputation: number): ReputationLevel {
    return REPUTATION_LEVELS.find((level) => reputation >= level.threshold) ?? REPUTATION_LEVELS[REPUTATION_LEVELS.length - 1];
}

/** How reputation points are earned — drives the "how to become a star" list. */
export const REPUTATION_RULES: { label: string; points: number }[] = [
    { label: 'Create a helpful topic', points: 5 },
    { label: 'Reply to a discussion', points: 2 },
    { label: 'Receive an upvote', points: 10 },
    { label: 'Have your answer accepted', points: 25 },
];

/** Verified-member badge (replaces the duplicated inline SVG). */
export function VerifiedBadge({ className, title = 'Verified member' }: { className?: string; title?: string }) {
    return (
        <span className={cn('inline-flex text-primary', className)} title={title}>
            <span className="sr-only">{title}</span>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                />
            </svg>
        </span>
    );
}
