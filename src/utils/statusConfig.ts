/**
 * Unified status → style registry for every transactional surface
 * (listings, offers, escrow deals + milestones + transfer items, campaigns).
 *
 * This replaces the ~7 copy-pasted STATUS_CONFIG maps that had drifted across
 * ManageListingsPage, OffersTable, the three Escrow pages, and the four
 * crowdfunding pages. All tints are translucent so they render correctly in
 * both light and dark mode. Consume via the <StatusBadge> UI component.
 */

import { StatusStyle, getStatusStyle as getCampaignStatusStyle } from './statusStyles';

export type { StatusStyle } from './statusStyles';

export type StatusKind = 'listing' | 'offer' | 'escrow' | 'milestone' | 'transfer' | 'campaign';

const TINTS = {
    slate: {
        badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
    },
    blue: {
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
    },
    primary: {
        badge: 'bg-primary/10 text-primary',
        text: 'text-primary',
        dot: 'bg-primary',
    },
    emerald: {
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    amber: {
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    violet: {
        badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        text: 'text-violet-600 dark:text-violet-400',
        dot: 'bg-violet-500',
    },
    red: {
        badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
        text: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
    },
} as const;

const style = (label: string, tint: keyof typeof TINTS): StatusStyle => ({ label, ...TINTS[tint] });

const LISTING: Record<string, StatusStyle> = {
    draft: style('Draft', 'slate'),
    pending_review: style('Pending review', 'amber'),
    under_review: style('Under review', 'amber'),
    active: style('Active', 'emerald'),
    paused: style('Paused', 'amber'),
    sold: style('Sold', 'blue'),
    rejected: style('Rejected', 'red'),
    archived: style('Archived', 'slate'),
};

const OFFER: Record<string, StatusStyle> = {
    pending: style('Pending', 'amber'),
    accepted: style('Accepted', 'emerald'),
    rejected: style('Rejected', 'red'),
    withdrawn: style('Withdrawn', 'slate'),
    countered: style('Countered', 'violet'),
};

const ESCROW: Record<string, StatusStyle> = {
    created: style('Created', 'slate'),
    funding: style('Awaiting funds', 'amber'),
    funded: style('Funded', 'blue'),
    inspection: style('Inspection', 'violet'),
    approval: style('Approval', 'violet'),
    releasing: style('Releasing', 'primary'),
    completed: style('Completed', 'emerald'),
    refunded: style('Refunded', 'slate'),
    disputed: style('Disputed', 'red'),
    held: style('On hold', 'amber'),
};

const MILESTONE: Record<string, StatusStyle> = {
    pending: style('Pending', 'slate'),
    in_progress: style('In progress', 'blue'),
    completed: style('Completed', 'emerald'),
    disputed: style('Disputed', 'red'),
};

const TRANSFER: Record<string, StatusStyle> = {
    pending: style('Pending', 'slate'),
    seller_ready: style('Seller ready', 'blue'),
    buyer_confirmed: style('Buyer confirmed', 'violet'),
    completed: style('Completed', 'emerald'),
    disputed: style('Disputed', 'red'),
};

const REGISTRY: Record<Exclude<StatusKind, 'campaign'>, Record<string, StatusStyle>> = {
    listing: LISTING,
    offer: OFFER,
    escrow: ESCROW,
    milestone: MILESTONE,
    transfer: TRANSFER,
};

const humanize = (status: string): StatusStyle => ({
    label: status ? status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Unknown',
    ...TINTS.slate,
});

/** Resolve a status style for a given surface kind (dark-mode safe). */
export function getStatusConfig(kind: StatusKind, status: string | null | undefined): StatusStyle {
    const key = (status ?? '').toString();
    if (kind === 'campaign') return getCampaignStatusStyle(key);
    return REGISTRY[kind]?.[key] ?? humanize(key);
}
