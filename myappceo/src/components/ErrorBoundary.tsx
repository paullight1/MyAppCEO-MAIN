import React, { Component, ReactNode } from 'react';
import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react';
import { ErrorState } from './ui';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
    onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorId: string | null;
}

interface ErrorReportDetail {
    error: Error;
    errorInfo: React.ErrorInfo;
    errorId: string;
}

declare global {
    interface Window {
        Sentry?: {
            captureException?: (error: Error, context?: Record<string, unknown>) => void;
        };
        __MVPLABX_REPORT_ERROR__?: (detail: ErrorReportDetail) => void;
    }
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorId: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorId: ErrorBoundary.createErrorId() };
    }

    private static createErrorId(): string {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return `err_${crypto.randomUUID()}`;
        }

        return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        const errorId = this.state.errorId ?? ErrorBoundary.createErrorId();
        const detail: ErrorReportDetail = { error, errorInfo, errorId };

        console.error(`[ErrorBoundary:${errorId}]`, error, errorInfo);
        this.props.onError?.(error, errorInfo, errorId);

        if (typeof window !== 'undefined') {
            window.Sentry?.captureException?.(error, {
                tags: { boundary: 'global', errorId },
                extra: { componentStack: errorInfo.componentStack },
            });
            window.__MVPLABX_REPORT_ERROR__?.(detail);
            window.dispatchEvent(new CustomEvent('mvplabx:error-boundary', { detail }));
        }
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorId: null });
        this.props.onReset?.();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-background px-4 py-10 text-foreground">
                    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center justify-center">
                        <ErrorState
                            icon={AlertTriangle}
                            title="Something went wrong"
                            description="The app hit an unexpected error. The incident has been captured so the team can investigate."
                            detail={this.state.error?.message}
                            severity="error"
                            action={{
                                label: 'Try again',
                                onClick: this.handleReset,
                                icon: RefreshCw,
                            }}
                            secondaryAction={{
                                label: 'Go to dashboard',
                                href: '/dashboard',
                                icon: Home,
                            }}
                            footer={
                                this.state.errorId ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                        <Bug className="h-3.5 w-3.5" aria-hidden="true" />
                                        Error ID: {this.state.errorId}
                                    </span>
                                ) : null
                            }
                            className="w-full"
                        />
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
