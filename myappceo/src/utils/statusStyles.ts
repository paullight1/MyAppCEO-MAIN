/**
 * Shared, dark-mode-safe status styling for promotion/campaign/social features.
 *
 * The old inline maps used light-only classes like `bg-emerald-100` which look
 * broken in dark mode. These tokens pair a translucent tint (works on both
 * themes) with theme-aware text colors.
 */

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface StatusStyle {
    label: string;
    /** Full badge classes: tint background + text color, valid in light & dark. */
    badge: string;
    /** Text-only color for inline usage. */
    text: string;
    /** Solid dot color for indicators. */
    dot: string;
}

const STYLES: Record<CampaignStatus, StatusStyle> = {
    draft: {
        label: 'Draft',
        badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
    },
    active: {
        label: 'Active',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    paused: {
        label: 'Paused',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    completed: {
        label: 'Completed',
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
    },
    cancelled: {
        label: 'Cancelled',
        badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
        text: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
    },
};

const FALLBACK: StatusStyle = {
    label: 'Unknown',
    badge: 'bg-muted text-muted-foreground',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
};

export const getStatusStyle = (status: string): StatusStyle =>
    STYLES[status as CampaignStatus] ?? { ...FALLBACK, label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown' };

/** ROI color thresholds, shared across analytics surfaces. */
export const roiColor = (roi: number): string =>
    roi >= 3 ? 'text-emerald-600 dark:text-emerald-400' : roi >= 1.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
