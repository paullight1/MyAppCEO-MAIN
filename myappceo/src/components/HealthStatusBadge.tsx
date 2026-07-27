import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, LucideIcon } from 'lucide-react';
import { HealthStatus } from '../hooks/usePromotionAnalytics';
import { cn } from '../utils/cn';

interface HealthStatusBadgeProps {
    status: HealthStatus;
    showLabel?: boolean;
}

// Translucent tints — valid in both light and dark mode (matches the app's
// shared statusConfig/ideaPresentation convention). Fixes the previous
// light-only bg-emerald-100/text-emerald-700 that was unreadable in dark mode.
const HEALTH_CONFIG: Record<HealthStatus, { icon: LucideIcon; label: string; className: string }> = {
    healthy: { icon: CheckCircle, label: 'Healthy', className: 'bg-success/10 text-success' },
    needs_attention: { icon: AlertTriangle, label: 'Needs Attention', className: 'bg-warning/10 text-warning' },
    low_performance: { icon: XCircle, label: 'Low Performance', className: 'bg-error/10 text-error' },
};

const FALLBACK = { icon: HelpCircle, label: 'Unknown', className: 'bg-muted text-muted-foreground' };

export const HealthStatusBadge: React.FC<HealthStatusBadgeProps> = ({ status, showLabel = true }) => {
    // Guard against an out-of-enum status arriving from the backend.
    const { icon: Icon, label, className } = HEALTH_CONFIG[status] ?? FALLBACK;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
                className,
            )}
            title={showLabel ? undefined : label}
            aria-label={showLabel ? undefined : label}
        >
            <Icon size={14} aria-hidden="true" />
            {showLabel && label}
        </span>
    );
};
