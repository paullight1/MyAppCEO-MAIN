import React from 'react';
import {
    Circle,
    Code2,
    FlaskConical,
    LayoutGrid,
    PenTool,
    Play,
    Rocket,
    CheckCircle2,
    Loader2,
    LucideIcon,
} from 'lucide-react';
import { AppProgress, DevelopmentPhase } from '../hooks/useDevelopment';
import { Button } from './ui/button';
import { EmptyState, ErrorState, LoadingState } from './ui/State';

const STEP_ICONS: LucideIcon[] = [LayoutGrid, PenTool, Code2, FlaskConical, Rocket];

interface AppLifecycleTrackerProps {
    appName?: string;
    progress: AppProgress | null;
    isLoading?: boolean;
    error?: string | null;
    canManage?: boolean;
    isInitializing?: boolean;
    onInitialize?: () => void;
}

// Tone-driven classes for the phase status node. Tokenized so it adapts to dark mode.
const statusTone: Record<string, string> = {
    completed: 'bg-success text-success-foreground border-success',
    in_progress: 'bg-primary text-primary-foreground border-primary',
    blocked: 'bg-error text-white border-error',
    skipped: 'bg-warning text-warning-foreground border-warning',
    not_started: 'bg-card text-muted-foreground border-border',
};

export const AppLifecycleTracker: React.FC<AppLifecycleTrackerProps> = ({
    appName,
    progress,
    isLoading = false,
    error,
    canManage = false,
    isInitializing = false,
    onInitialize,
}) => {
    const phases = progress?.phases || [];
    const activePhase =
        phases.find((phase) => phase.status === 'in_progress') ||
        phases.find((phase) => phase.status !== 'completed') ||
        null;
    const overallProgress = progress?.overallProgress ?? 0;

    if (isLoading) {
        return <LoadingState title="Loading lifecycle progress…" />;
    }

    if (error) {
        return (
            <ErrorState
                title="Lifecycle progress is unavailable"
                description={error}
                severity="warning"
            />
        );
    }

    if (!phases.length) {
        return (
            <EmptyState
                icon={Circle}
                title="No lifecycle phases yet"
                description="This app has a persisted workspace, but development tracking hasn't been initialized."
                action={
                    canManage && onInitialize
                        ? { label: isInitializing ? 'Initializing…' : 'Initialize tracking', onClick: onInitialize, icon: isInitializing ? Loader2 : Play }
                        : undefined
                }
            />
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-foreground">App lifecycle</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {appName ? `Tracking ${appName} from setup to launch.` : 'Tracking persisted development progress.'}
                    </p>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                    {overallProgress}% complete
                </div>
            </div>

            <div className="p-6">
                <div
                    className="mb-6 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.round(overallProgress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Overall lifecycle progress"
                >
                    <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${Math.max(0, Math.min(overallProgress, 100))}%` }}
                    />
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                    {phases.map((phase: DevelopmentPhase, index: number) => {
                        const Icon = STEP_ICONS[index] || LayoutGrid;
                        return (
                            <div key={phase.id} className="rounded-2xl border border-border bg-muted/40 p-4">
                                <div
                                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
                                        statusTone[phase.status] || statusTone.not_started
                                    }`}
                                >
                                    {phase.status === 'completed' ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                    ) : (
                                        <Icon className="h-5 w-5" />
                                    )}
                                </div>
                                <p className="text-sm font-bold text-foreground">{phase.name}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                    {phase.description || 'No description provided.'}
                                </p>
                                <p className="mt-3 text-xs font-bold text-primary">{phase.completionPct ?? 0}%</p>
                            </div>
                        );
                    })}
                </div>

                {activePhase && (
                    <div className="mt-6 rounded-2xl border border-border bg-foreground p-5 text-background">
                        <p className="text-xs font-bold uppercase tracking-widest text-background/50">Current phase</p>
                        <p className="mt-2 text-lg font-bold">{activePhase.name}</p>
                        <p className="mt-1 text-sm leading-6 text-background/70">
                            {activePhase.description || 'No phase details have been added yet.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
