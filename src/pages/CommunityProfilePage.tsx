import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    ArrowLeft,
    MessageCircle,
    FileText,
    CheckCircle2,
    ThumbsUp,
    TrendingUp,
} from 'lucide-react';
import { useCommunity, CommunityUserStats, Topic } from '../hooks/useCommunity';
import { LoadingState, EmptyState } from '../components/ui';
import { getReputationLevel, VerifiedBadge } from '../utils/community';
import { formatDate } from '../utils/format';

export const CommunityProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { getUserStats, getTopics, isLoading } = useCommunity();

    const [stats, setStats] = useState<CommunityUserStats | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [activeTab, setActiveTab] = useState<'topics' | 'replies'>('topics');

    useEffect(() => {
        if (userId) loadData();
    }, [userId]);

    const loadData = async () => {
        if (!userId) return;
        try {
            const statsData = await getUserStats(userId);
            setStats(statsData);

            // TODO: getTopics has no author filter, so we fetch a page of topics and
            // client-filter by userId. This under-counts a user's topics; replace with a
            // dedicated `/community/users/:id/topics` endpoint when available.
            const topicsResult = await getTopics({ limit: 10 });
            const userTopics = topicsResult.data.filter(t => t.userId === userId);
            setTopics(userTopics);
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    };

    if (isLoading && !stats) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-12">
                    <LoadingState title="Loading profile" />
                </div>
            </DashboardLayout>
        );
    }

    if (!stats) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-20">
                    <EmptyState
                        title="User not found"
                        description="This community member does not exist or is no longer available."
                        action={{ label: 'Back to Community', href: '/community' }}
                    />
                </div>
            </DashboardLayout>
        );
    }

    const level = getReputationLevel(stats.reputation);
    const LevelIcon = level.Icon;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Link
                    to="/community"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Community
                </Link>

                <div className="bg-card border border-border rounded-2xl p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                            {stats.user?.fullName?.[0] || '?'}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-foreground">{stats.user?.fullName || 'Unknown'}</h1>
                                {stats.isVerified && (
                                    <span className="px-2 py-0.5 bg-primary/15 text-primary text-xs font-bold rounded-full flex items-center gap-1">
                                        <CheckCircle2 size={12} aria-hidden="true" /> Verified
                                    </span>
                                )}
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                                <LevelIcon size={16} className={level.color} aria-hidden="true" />
                                <span className={`text-sm font-bold ${level.color}`}>{level.name}</span>
                            </div>
                            <p className="text-muted-foreground text-sm mt-2">
                                Member since {formatDate(stats.user?.createdAt || stats.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-primary/15 to-violet-600/15 rounded-2xl">
                            <TrendingUp size={24} className="mx-auto text-primary mb-2" aria-hidden="true" />
                            <div className="text-3xl font-bold text-foreground">{stats.reputation}</div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Reputation</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <FileText size={24} className="mx-auto text-primary mb-2" aria-hidden="true" />
                        <div className="text-2xl font-bold text-foreground">{stats.topicsCount}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Topics</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <MessageCircle size={24} className="mx-auto text-primary mb-2" aria-hidden="true" />
                        <div className="text-2xl font-bold text-foreground">{stats.postsCount}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Replies</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <ThumbsUp size={24} className="mx-auto text-error mb-2" aria-hidden="true" />
                        <div className="text-2xl font-bold text-foreground">{stats.upvotesReceived}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Upvotes</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <CheckCircle2 size={24} className="mx-auto text-success mb-2" aria-hidden="true" />
                        <div className="text-2xl font-bold text-foreground">{stats.answersAccepted}</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Answers Accepted</div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex border-b border-border" role="tablist" aria-label="Profile activity">
                        <button
                            id="tab-topics"
                            role="tab"
                            aria-selected={activeTab === 'topics'}
                            aria-controls="panel-topics"
                            onClick={() => setActiveTab('topics')}
                            className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${activeTab === 'topics' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Topics ({stats.topicsCount})
                        </button>
                        <button
                            id="tab-replies"
                            role="tab"
                            aria-selected={activeTab === 'replies'}
                            aria-controls="panel-replies"
                            onClick={() => setActiveTab('replies')}
                            className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${activeTab === 'replies' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Replies ({stats.postsCount})
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'topics' && (
                            <div id="panel-topics" role="tabpanel" aria-labelledby="tab-topics">
                                {topics.length === 0 ? (
                                    <EmptyState
                                        icon={FileText}
                                        size="sm"
                                        title="No topics yet"
                                        description="This member has not started any discussions."
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {topics.map(topic => (
                                            <Link
                                                key={topic.id}
                                                to={`/community/topic/${topic.slug}`}
                                                className="block p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-foreground truncate">{topic.title}</h4>
                                                        <p className="text-sm text-muted-foreground line-clamp-1">{topic.content}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                                                        <span>{topic.viewCount} views</span>
                                                        <span>{topic.replyCount} replies</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'replies' && (
                            <div id="panel-replies" role="tabpanel" aria-labelledby="tab-replies">
                                <EmptyState
                                    icon={MessageCircle}
                                    size="sm"
                                    title="Replies coming soon"
                                    description="Reply history for this member will appear here."
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
