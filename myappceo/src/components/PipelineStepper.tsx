import React from 'react';
import {
    Boxes,
    Calculator,
    Check,
    FileText,
    Lightbulb,
    Loader2,
    LucideIcon,
    Palette,
    Rocket,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getPipelineStageStates } from '../utils/ideaLifecycle';

/** Resolves the icon names stored in ideaLifecycle's stage config to components. */
const STAGE_ICONS: Record<string, LucideIcon> = {
    Lightbulb,
    FileText,
    Palette,
    Calculator,
    Rocket,
    Boxes,
};

interface PipelineStepperProps {
    /** Current idea lifecycle status. */
    status: string;
    /** Compact removes the labels (for dense cards); default shows labels. */
    variant?: 'default' | 'compact';
    className?: string;
    /** Optional per-stage click (e.g. jump to the PRD tab). */
    onStageClick?: (stageKey: string) => void;
}

/**
 * Horizontal lifecycle tracker for an idea, from raw idea → live app. Reads its
 * stages and per-stage state (complete / active / upcoming) from
 * `getPipelineStageStates` so it stays in lockstep with the lifecycle state
 * machine. Fully tokenized and theme-aware.
 */
export function PipelineStepper({ status, variant = 'default', className, onStageClick }: PipelineStepperProps) {
    const stages = getPipelineStageStates(status);
    const showLabels = variant !== 'compact';

    return (
        <ol
            className={cn('flex items-start overflow-x-auto', className)}
            aria-label="App pipeline progress"
        >
            {stages.map((stage, index) => {
                const Icon = STAGE_ICONS[stage.icon] ?? Lightbulb;
                const isLast = index === stages.length - 1;
                const interactive = Boolean(onStageClick);

                const node = (
                    <span
                        className={cn(
                            'relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                            stage.state === 'complete' && 'border-primary bg-primary text-primary-foreground',
                            stage.state === 'active' && 'border-primary bg-primary/10 text-primary',
                            stage.state === 'upcoming' && 'border-border bg-card text-muted-foreground'
                        )}
                    >
                        {stage.inProgress ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : stage.state === 'complete' ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Icon className="h-4 w-4" aria-hidden="true" />
                        )}
                    </span>
                );

                return (
                    <li
                        key={stage.key}
                        className={cn('flex min-w-0 flex-1 flex-col items-center', isLast && 'flex-none')}
                        aria-current={stage.state === 'active' ? 'step' : undefined}
                    >
                        <div className="flex w-full items-center">
                            {/* leading connector (hidden on first) */}
                            {index > 0 && (
                                <span
                                    className={cn(
                                        'h-0.5 flex-1',
                                        stage.state === 'upcoming' ? 'bg-border' : 'bg-primary'
                                    )}
                                    aria-hidden="true"
                                />
                            )}
                            {interactive ? (
                                <button
                                    type="button"
                                    onClick={() => onStageClick?.(stage.key)}
                                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    aria-label={`${stage.label} — ${stage.state}`}
                                >
                                    {node}
                                </button>
                            ) : (
                                node
                            )}
                            {/* trailing connector (hidden on last) */}
                            {!isLast && (
                                <span
                                    className={cn(
                                        'h-0.5 flex-1',
                                        stages[index + 1].state === 'upcoming' ? 'bg-border' : 'bg-primary'
                                    )}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                        {showLabels && (
                            <span
                                className={cn(
                                    'mt-2 text-center text-xs font-semibold',
                                    stage.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
                                )}
                            >
                                {stage.label}
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
