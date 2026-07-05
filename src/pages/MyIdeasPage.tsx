import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Link } from 'react-router-dom';
import {
    Plus,
    Lightbulb,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useIdeas, Idea } from '../hooks/useIdeas';
import { IDEA_STATUS } from '../utils/ideaLifecycle';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { getStatusBadge, getCategoryLabel, getIdeaCompletion } from '../utils/ideaPresentation';
import { formatCurrency } from '../utils/format';

export const MyIdeasPage: React.FC = () => {
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'status'>('newest');
    const { getMyIdeas } = useIdeas();

    useEffect(() => {
        loadIdeas();
    }, []);

    const loadIdeas = async () => {
        setIsLoading(true);
        setLoadError(null);
        const result = await getMyIdeas();
        if (result.success && result.data) {
            // API contract is unstable: some paths wrap the array in `.data`, others return it directly.
            setIdeas((result.data as any).data || result.data);
        } else {
            setLoadError(result.error || 'We could not load your ideas. Please try again.');
        }
        setIsLoading(false);
    };

    const filteredIdeas = useMemo(() => {
        let result = [...ideas];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(idea =>
                idea.title.toLowerCase().includes(query) ||
                idea.description.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(idea => idea.status === statusFilter);
        }

        switch (sortBy) {
            case 'newest':
                result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'name':
                result.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'status': {
                const statusOrder: string[] = [
                    IDEA_STATUS.READY_FOR_FUNDING,
                    IDEA_STATUS.SUBMITTED_FOR_FUNDING,
                    IDEA_STATUS.DESIGN_COMPLETE,
                    IDEA_STATUS.PRD_GENERATED,
                    IDEA_STATUS.DRAFT,
                    IDEA_STATUS.ARCHIVED,
                ];
                result.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
                break;
            }
        }

        return result;
    }, [ideas, searchQuery, statusFilter, sortBy]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: ideas.length };
        ideas.forEach(idea => {
            counts[idea.status] = (counts[idea.status] || 0) + 1;
        });
        return counts;
    }, [ideas]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-8">
                    <LoadingState title="Loading your ideas..." className="min-h-[50vh]" />
                </div>
            </DashboardLayout>
        );
    }

    if (loadError) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-8">
                    <ErrorState
                        title="Couldn't load your ideas"
                        description={loadError}
                        action={{ label: 'Try again', onClick: loadIdeas }}
                        secondaryAction={{ label: 'New Idea', href: '/ideas/new', icon: Plus }}
                    />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">My Ideas</h1>
                        <p className="text-muted-foreground mt-1">
                            {ideas.length === 0
                                ? 'Start by creating your first app idea'
                                : `${ideas.length} idea${ideas.length !== 1 ? 's' : ''} in progress`}
                        </p>
                    </div>
                    <Link
                        to="/ideas/new"
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 inline-flex items-center gap-2 font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        <Plus className="w-4 h-4" />
                        New Idea
                    </Link>
                </div>

                {ideas.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <label htmlFor="idea-search" className="sr-only">Search ideas</label>
                            <input
                                id="idea-search"
                                type="text"
                                placeholder="Search ideas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border text-foreground rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                            />
                        </div>
                        <div className="flex gap-2">
                            <label htmlFor="idea-status-filter" className="sr-only">Filter by status</label>
                            <select
                                id="idea-status-filter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2.5 bg-card border border-border text-foreground rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                            >
                                <option value="all">All Status ({statusCounts.all})</option>
                                <option value="draft">Draft ({statusCounts.draft || 0})</option>
                                <option value="prd_generated">PRD Ready ({statusCounts.prd_generated || 0})</option>
                                <option value="design_complete">Designs Ready ({statusCounts.design_complete || 0})</option>
                                <option value="ready_for_funding">Ready to Fund ({statusCounts.ready_for_funding || 0})</option>
                            </select>
                            <label htmlFor="idea-sort" className="sr-only">Sort ideas</label>
                            <select
                                id="idea-sort"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-4 py-2.5 bg-card border border-border text-foreground rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="name">Name A-Z</option>
                                <option value="status">By Status</option>
                            </select>
                        </div>
                    </div>
                )}

                {ideas.length === 0 ? (
                    <EmptyState
                        icon={Lightbulb}
                        size="lg"
                        title="No ideas yet"
                        description="Describe your app idea and we'll help you create a PRD, designs, and cost estimate."
                        action={{ label: 'Create Your First Idea', href: '/ideas/new', icon: Sparkles }}
                    />
                ) : filteredIdeas.length === 0 ? (
                    <EmptyState
                        icon={Search}
                        title="No ideas match your search"
                        description="Try adjusting your filters to find what you're looking for."
                        action={{ label: 'Clear filters', onClick: () => { setSearchQuery(''); setStatusFilter('all'); } }}
                    />
                ) : (
                    <div className="space-y-4">
                        {filteredIdeas.map((idea, index) => {
                            const badge = getStatusBadge(idea.status);
                            const { steps } = getIdeaCompletion(idea);
                            const completedCount = steps.filter(s => s.done).length;

                            return (
                                <motion.div
                                    key={idea.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden"
                                >
                                    <Link
                                        to={`/ideas/${idea.id}`}
                                        className="block p-6 hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                    <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                                                        {getCategoryLabel(idea.category)}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                    {idea.title}
                                                </h3>
                                                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                                                    {idea.description}
                                                </p>

                                                <div className="flex items-center gap-4 mt-4">
                                                    {steps.map((step) => (
                                                        <div key={step.key} className="flex items-center gap-1.5">
                                                            {step.done ? (
                                                                <CheckCircle2 className="w-4 h-4 text-success" />
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-full bg-muted shadow-inner" />
                                                            )}
                                                            <span className={`text-xs font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-2 md:min-w-[140px]">
                                                {idea.costEstimate ? (
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Est. Cost</p>
                                                        <p className="text-xl font-bold text-foreground">
                                                            {formatCurrency(idea.costEstimate, { maximumFractionDigits: 0 })}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Progress</p>
                                                        <p className="text-lg font-bold text-foreground">
                                                            {completedCount}/{steps.length}
                                                        </p>
                                                    </div>
                                                )}
                                                {idea.timelineWeeks && (
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">Timeline</p>
                                                        <p className="text-sm font-medium text-foreground">{idea.timelineWeeks} weeks</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    {idea.status === 'ready_for_funding' && (
                                        <div className="px-6 pb-5 -mt-1 flex items-center justify-between border-t border-border pt-4">
                                            <p className="text-sm text-success font-medium flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Ready to start crowdfunding!
                                            </p>
                                            <Link
                                                to={`/campaigns/new?ideaId=${idea.id}`}
                                                className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                                            >
                                                Start Campaign <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
