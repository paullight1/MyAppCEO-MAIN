import React, { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2, LucideIcon, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

type StateAction = {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
};

interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    icon?: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    action?: StateAction;
    secondaryAction?: StateAction;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

interface LoadingStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
    title?: ReactNode;
    description?: ReactNode;
    rows?: number;
    variant?: 'spinner' | 'skeleton';
}

interface ErrorStateProps extends EmptyStateProps {
    detail?: ReactNode;
    severity?: 'error' | 'warning';
}

function StateActionButton({ action, variant }: { action: StateAction; variant: 'primary' | 'secondary' }) {
    const Icon = action.icon;
    const className = cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variant === 'primary'
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-border bg-card text-foreground hover:bg-muted'
    );
    const content = (
        <>
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            <span>{action.label}</span>
        </>
    );

    if (action.href) {
        return (
            <a href={action.href} className={className}>
                {content}
            </a>
        );
    }

    return (
        <button type="button" onClick={action.onClick} className={className}>
            {content}
        </button>
    );
}

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    secondaryAction,
    footer,
    size = 'md',
    className,
    ...props
}: EmptyStateProps) {
    const sizeClasses = {
        sm: 'p-5',
        md: 'p-8',
        lg: 'p-10 md:p-12',
    };

    return (
        <section
            className={cn(
                'rounded-2xl border border-dashed border-border bg-card text-center shadow-sm',
                sizeClasses[size],
                className
            )}
            {...props}
        >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="mx-auto mt-4 max-w-md space-y-2">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
            </div>
            {(action || secondaryAction) && (
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    {action && <StateActionButton action={action} variant="primary" />}
                    {secondaryAction && <StateActionButton action={secondaryAction} variant="secondary" />}
                </div>
            )}
            {footer && <div className="mt-5 text-sm text-muted-foreground">{footer}</div>}
        </section>
    );
}

export function LoadingState({
    title = 'Loading',
    description,
    rows = 3,
    variant = 'spinner',
    className,
    ...props
}: LoadingStateProps) {
    if (variant === 'skeleton') {
        return (
            <div className={cn('space-y-3 rounded-2xl border border-border bg-card p-5', className)} {...props}>
                <span className="sr-only">{title}</span>
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className="space-y-2" aria-hidden="true">
                        <div className="loading-shimmer h-4 w-3/4 rounded-full" />
                        <div className="loading-shimmer h-4 w-full rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn('flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center', className)}
            role="status"
            aria-live="polite"
            {...props}
        >
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
        </div>
    );
}

export function ErrorState({
    icon = AlertCircle,
    title,
    description,
    detail,
    severity = 'error',
    action,
    secondaryAction,
    footer,
    className,
    ...props
}: ErrorStateProps) {
    const Icon = icon;

    return (
        <section
            className={cn('rounded-2xl border bg-card p-8 text-center shadow-sm', severity === 'error' ? 'border-error/30' : 'border-warning/40', className)}
            role="alert"
            {...props}
        >
            <div
                className={cn(
                    'mx-auto flex h-14 w-14 items-center justify-center rounded-full',
                    severity === 'error' ? 'bg-error/10 text-error' : 'bg-warning/15 text-warning'
                )}
            >
                <Icon className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="mx-auto mt-4 max-w-md space-y-2">
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
                {detail && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-left text-xs leading-5 text-muted-foreground">
                        {detail}
                    </p>
                )}
            </div>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                {action && <StateActionButton action={{ icon: RefreshCw, ...action }} variant="primary" />}
                {secondaryAction && <StateActionButton action={secondaryAction} variant="secondary" />}
            </div>
            {footer && <div className="mt-5">{footer}</div>}
        </section>
    );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('loading-shimmer rounded-md', className)} aria-hidden="true" {...props} />;
}
