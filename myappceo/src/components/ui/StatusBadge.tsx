import React from 'react';
import { cn } from '../../utils/cn';
import { getStatusConfig, StatusKind } from '../../utils/statusConfig';

interface StatusBadgeProps {
    kind: StatusKind;
    status: string | null | undefined;
    /** Show a leading colored dot. */
    dot?: boolean;
    /** Animate the dot (useful for live/active states). */
    pulse?: boolean;
    size?: 'sm' | 'md';
    /** Override the auto-resolved label. */
    label?: string;
    className?: string;
}

/**
 * A single, dark-mode-safe status pill driven by the shared status registry.
 * Replaces the copy-pasted STATUS_CONFIG maps across marketplace / escrow /
 * crowdfunding pages.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
    kind,
    status,
    dot = false,
    pulse = false,
    size = 'md',
    label,
    className,
}) => {
    const config = getStatusConfig(kind, status);
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
                size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
                config.badge,
                className,
            )}
        >
            {dot && (
                <span className="relative flex h-1.5 w-1.5">
                    {pulse && (
                        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', config.dot)} />
                    )}
                    <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', config.dot)} />
                </span>
            )}
            {label ?? config.label}
        </span>
    );
};
