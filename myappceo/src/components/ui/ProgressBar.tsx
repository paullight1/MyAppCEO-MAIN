import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressBarProps {
    /** 0–100. Values outside the range are clamped. */
    value: number;
    size?: 'sm' | 'md' | 'lg';
    tone?: 'primary' | 'emerald' | 'amber' | 'red';
    /** Render an accessible label; also exposes value to screen readers. */
    label?: string;
    className?: string;
}

const HEIGHTS = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
const TONES = {
    primary: 'bg-primary',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
};

/** A rounded, animated progress bar driven by design tokens. */
export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    size = 'md',
    tone = 'primary',
    label,
    className,
}) => {
    const pct = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);
    return (
        <div
            className={cn('w-full overflow-hidden rounded-full bg-muted', HEIGHTS[size], className)}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
        >
            <div
                className={cn('h-full rounded-full transition-[width] duration-700 ease-out', TONES[tone])}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};
