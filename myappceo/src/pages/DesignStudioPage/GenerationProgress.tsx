import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

type ProgressValue = number | {
    progress: number;
    status?: string;
    error?: string;
};

interface GenerationProgressProps {
    progress: Record<string, ProgressValue>;
    total: number;
    completed: number;
}

const PAGE_NAMES: Record<string, string> = {
    home: 'Home Screen',
    search: 'Search',
    profile: 'Profile',
    details: 'Task Details',
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
    progress,
    total,
    completed,
}) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pages = Object.keys(progress);
    const getProgressValue = (value: ProgressValue) => typeof value === 'number' ? value : value.progress;
    const getStatusValue = (value: ProgressValue) => typeof value === 'number' ? undefined : value.status;
    const getErrorValue = (value: ProgressValue) => typeof value === 'number' ? undefined : value.error;

    return (
        <div className="max-w-2xl mx-auto py-12">
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                    <Sparkles className="w-10 h-10 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground">Generating Your Designs</h2>
                <p className="text-muted-foreground mt-2">
                    AI is creating beautiful UI mockups for your app
                </p>
            </div>

            {/* Overall Progress */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Overall Progress</span>
                    <span className="text-sm font-bold text-primary">{percentage}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    {completed} of {total} screens complete
                </p>
            </div>

            {/* Individual Page Progress */}
            <div className="space-y-3">
                {pages.map((pageId) => {
                    const item = progress[pageId] || 0;
                    const pageProgress = getProgressValue(item);
                    const status = getStatusValue(item);
                    const error = getErrorValue(item);
                    const isComplete = pageProgress >= 100;
                    const isFailed = status === 'failed';
                    const isCancelled = status === 'cancelled';
                    const pageName = PAGE_NAMES[pageId] || pageId;

                    return (
                        <motion.div
                            key={pageId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-card border border-border rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    {isComplete ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : isFailed || isCancelled ? (
                                        <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive text-xs flex items-center justify-center">!</span>
                                    ) : (
                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    )}
                                    <span className="font-medium text-foreground">{pageName}</span>
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">
                                    {isComplete ? 'Complete' : isFailed ? 'Failed' : isCancelled ? 'Cancelled' : `${pageProgress}%`}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div 
                                    className={cn(
                                        'h-full rounded-full',
                                        isComplete ? 'bg-emerald-500' : 'bg-primary'
                                    )}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pageProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            {error && (
                                <p className="mt-2 text-xs text-destructive">{error}</p>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Tips */}
            <div className="mt-8 p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground text-center">
                    💡 Tip: While designs generate, you can modify your brand colors or add more features to the PRD
                </p>
            </div>
        </div>
    );
};
