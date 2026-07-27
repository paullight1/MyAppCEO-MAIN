import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatTileProps {
    label: React.ReactNode;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: LucideIcon;
    /** Small trend chip, e.g. "+12%". */
    trend?: { value: string; positive?: boolean };
    /** `card` = bordered surface, `plain` = label/value only (for use inside a Card). */
    variant?: 'card' | 'plain';
    align?: 'left' | 'right';
    className?: string;
}

/**
 * A single label + value statistic tile. Replaces the ~25 hand-rolled
 * "uppercase label + bold value" blocks across the transactional pages.
 */
export const StatTile: React.FC<StatTileProps> = ({
    label,
    value,
    hint,
    icon: Icon,
    trend,
    variant = 'card',
    align = 'left',
    className,
}) => (
    <div
        className={cn(
            variant === 'card' && 'rounded-2xl border border-border bg-card p-5',
            align === 'right' && 'text-right',
            className,
        )}
    >
        <div className={cn('flex items-center gap-2', align === 'right' && 'justify-end')}>
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
        <div className={cn('mt-1.5 flex items-baseline gap-2', align === 'right' && 'justify-end')}>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {trend && (
                <span
                    className={cn(
                        'text-xs font-semibold',
                        trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                    )}
                >
                    {trend.value}
                </span>
            )}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
);
