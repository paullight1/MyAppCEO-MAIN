import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ESCROW_STAGES } from './shared';

interface EscrowTimelineProps {
    /** Active 1-based stage (use resolveStageIndex). */
    currentStage: number;
    className?: string;
}

/**
 * Vertical escrow progress timeline with a connector line. Shared by the
 * dashboard deal detail so both surfaces show the same 5-stage journey.
 */
export const EscrowTimeline: React.FC<EscrowTimelineProps> = ({ currentStage, className }) => (
    <ol className={cn('relative space-y-6', className)}>
        {ESCROW_STAGES.map((stage, idx) => {
            const isComplete = stage.id < currentStage;
            const isCurrent = stage.id === currentStage;
            const isLast = idx === ESCROW_STAGES.length - 1;

            return (
                <li key={stage.id} className="relative flex gap-4">
                    {!isLast && (
                        <span
                            aria-hidden="true"
                            className={cn(
                                'absolute left-[15px] top-8 h-[calc(100%+0.5rem)] w-0.5',
                                isComplete ? 'bg-primary' : 'bg-border',
                            )}
                        />
                    )}
                    <span
                        className={cn(
                            'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                            isComplete && 'border-primary bg-primary text-primary-foreground',
                            isCurrent && 'border-primary bg-card text-primary ring-4 ring-primary/15',
                            !isComplete && !isCurrent && 'border-border bg-card text-muted-foreground',
                        )}
                    >
                        {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : stage.id}
                    </span>
                    <div className={cn('pb-1', !isComplete && !isCurrent && 'opacity-60')}>
                        <p className={cn('text-sm font-semibold', isCurrent ? 'text-primary' : 'text-foreground')}>
                            {stage.label}
                            {isCurrent && <span className="ml-2 text-xs font-medium text-primary/70">In progress</span>}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                </li>
            );
        })}
    </ol>
);
