import { IDEA_STATUS } from './ideaLifecycle';

/**
 * Presentation config for ideas — status badges, category/platform labels and
 * completion progress. Previously duplicated verbatim across MyIdeasPage and
 * IdeaDetailPage; this is now the single source of truth.
 */

export interface StatusBadge {
    label: string;
    /** Full set of badge classes (bg + text + border), token/semantic based. */
    className: string;
}

export const IDEA_STATUS_BADGES: Record<string, StatusBadge> = {
    draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
    prd_generating: { label: 'Generating…', className: 'bg-warning/10 text-warning border-warning/20' },
    prd_generated: { label: 'PRD Ready', className: 'bg-primary/10 text-primary border-primary/20' },
    designing: { label: 'Designing…', className: 'bg-warning/10 text-warning border-warning/20' },
    design_complete: { label: 'Designs Ready', className: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
    estimating: { label: 'Estimating…', className: 'bg-warning/10 text-warning border-warning/20' },
    ready_for_funding: { label: 'Ready to Fund', className: 'bg-success/10 text-success border-success/20' },
    submitted_for_funding: { label: 'Campaign Active', className: 'bg-success/10 text-success border-success/20' },
    archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border-border' },
    converted_to_app: { label: 'Converted', className: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
};

export const getStatusBadge = (status: string): StatusBadge =>
    IDEA_STATUS_BADGES[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };

export const IDEA_CATEGORY_LABELS: Record<string, string> = {
    mobile_app: 'Mobile App',
    web_app: 'Web App',
    saas: 'SaaS',
    marketplace: 'Marketplace',
    social: 'Social App',
    ai_product: 'AI Product',
    game: 'Game',
    productivity: 'Productivity',
    other: 'Other',
};

export const IDEA_PLATFORM_LABELS: Record<string, string> = {
    mobile: 'Mobile',
    web: 'Web',
    desktop: 'Desktop',
    cross_platform: 'Cross-platform',
};

export const getCategoryLabel = (category?: string): string =>
    (category && IDEA_CATEGORY_LABELS[category]) || 'Other';

export const getPlatformLabel = (platform?: string): string =>
    (platform && IDEA_PLATFORM_LABELS[platform]) || 'Mobile';

export interface CompletionStep {
    key: 'prd' | 'designs' | 'estimate';
    label: string;
    done: boolean;
}

/** Minimal shape needed to compute completion — avoids importing the full Idea type. */
interface CompletionInput {
    status?: string;
    prdDocument?: unknown;
    designMockups?: unknown[] | null;
    costEstimate?: unknown;
}

/**
 * Derive the 3-step build progress (PRD → Designs → Estimate) from an idea's
 * status and generated artifacts. Returns the steps plus a 0–100 percentage.
 */
export function getIdeaCompletion(idea: CompletionInput): { steps: CompletionStep[]; percent: number } {
    const status = idea.status ?? IDEA_STATUS.DRAFT;
    const stageReached = (() => {
        if (([IDEA_STATUS.PRD_GENERATED, IDEA_STATUS.DESIGNING] as string[]).includes(status)) return 1;
        if (([IDEA_STATUS.DESIGN_COMPLETE, IDEA_STATUS.ESTIMATING] as string[]).includes(status)) return 2;
        if (
            (
                [
                    IDEA_STATUS.READY_FOR_FUNDING,
                    IDEA_STATUS.SUBMITTED_FOR_FUNDING,
                    IDEA_STATUS.CONVERTED_TO_APP,
                ] as string[]
            ).includes(status)
        )
            return 3;
        return 0;
    })();

    const steps: CompletionStep[] = [
        { key: 'prd', label: 'PRD', done: stageReached >= 1 || !!idea.prdDocument },
        { key: 'designs', label: 'Designs', done: stageReached >= 2 || (idea.designMockups?.length ?? 0) > 0 },
        { key: 'estimate', label: 'Estimate', done: stageReached >= 3 || !!idea.costEstimate },
    ];

    const done = steps.filter((s) => s.done).length;
    return { steps, percent: Math.round((done / steps.length) * 100) };
}
