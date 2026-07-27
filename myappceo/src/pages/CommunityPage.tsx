import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Layout } from '../components/Layout';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    MessageSquare, Search, Plus, ArrowRight, MessageCircle, Heart,
    Loader2, Bookmark, Menu, X, Flame, ChevronRight, Lock, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommunity, Forum, Topic, CommunityUserStats } from '../hooks/useCommunity';
import { useAuth } from '../hooks/useAuth';
import { LoadingState, EmptyState, ErrorState } from '../components/ui';
import { formatRelativeTime } from '../utils/format';

const TopicCard: React.FC<{
    topic: Topic;
    index: number;
    onVote: () => void;
    onBookmark: () => void;
    forumLabel: string;
}> = ({ topic, index, onVote, onBookmark, forumLabel }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.2) }}
        className="bg-card rounded-[8px] p-6 border border-border hover:shadow-[0_3px_30px_rgba(0,0,0,0.22)] transition-all duration-300 group"
    >
        <div className="flex gap-6">
            <div className="hidden sm:flex flex-col items-center gap-2">
                <button
                    onClick={onVote}
                    aria-label={topic.userVote === 'upvote' ? 'Remove upvote' : 'Upvote'}
                    aria-pressed={topic.userVote === 'upvote'}
                    className={`p-2 rounded-[4px] transition-all duration-300 ${topic.userVote === 'upvote' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                >
                    <Heart size={18} className={topic.userVote === 'upvote' ? 'fill-current' : ''} />
                </button>
                <span className={`text-[14px] font-semibold ${topic.upvotes > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{topic.upvotes || 0}</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-[12px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{forumLabel || 'General'}</span>
                    {topic.isSolved && <span className="text-[12px] font-semibold text-success bg-success/10 px-3 py-1 rounded-full">Solved</span>}
                    <span className="text-[12px] text-muted-foreground">{formatRelativeTime(topic.createdAt)}</span>
                </div>

                <Link to={`/community/topic/${topic.slug}`}>
                    <h3 className="text-[17px] text-foreground font-semibold group-hover:text-primary mb-2">{topic.title}</h3>
                    <p className="text-[14px] text-muted-foreground line-clamp-2 mb-4">{topic.content}</p>
                </Link>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={`/community/profile/${topic.author?.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                            <div className="w-8 h-8 rounded-[4px] bg-primary flex items-center justify-center text-white text-[12px] font-semibold">{topic.author?.fullName?.[0] || '?'}</div>
                            <span className="text-[12px] text-muted-foreground">{topic.author?.fullName || 'Unknown'}</span>
                        </Link>
                        <span className="text-[12px] text-muted-foreground flex items-center gap-1"><MessageCircle size={12} aria-hidden="true" /> {topic.replyCount || 0}</span>
                        <span className="text-[12px] text-muted-foreground">{topic.viewCount || 0} views</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onBookmark}
                            aria-label={topic.isBookmarked ? 'Remove bookmark' : 'Bookmark topic'}
                            aria-pressed={topic.isBookmarked}
                            className={`p-2 rounded-[4px] transition-all duration-300 ${topic.isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                        >
                            <Bookmark size={16} className={topic.isBookmarked ? 'fill-current' : ''} />
                        </button>
                        <Link to={`/community/topic/${topic.slug}`} aria-label="Open topic" className="p-2 text-muted-foreground hover:text-primary rounded-[4px]"><ArrowRight size={16} /></Link>
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);

const TrendingSection: React.FC<{ topics: Topic[] }> = ({ topics }) => (
    <div className="mb-8 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-[8px] p-6">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-[4px] flex items-center justify-center"><Flame size={16} className="text-primary" aria-hidden="true" /></div>
            <h3 className="text-[21px] text-foreground font-semibold">Trending Now</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {topics.slice(0, 5).map((topic, i) => (
                <Link key={topic.id} to={`/community/topic/${topic.slug}`} className="flex-shrink-0 w-[280px] p-4 bg-card border border-border rounded-[8px] hover:shadow-[0_3px_30px_rgba(0,0,0,0.22)] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[12px] text-primary font-semibold">#{i + 1}</span>
                        <span className="text-[12px] text-muted-foreground">{topic.viewCount} views</span>
                    </div>
                    <p className="text-[14px] text-foreground line-clamp-2">{topic.title}</p>
                </Link>
            ))}
        </div>
    </div>
);

const Pagination: React.FC<{ page: number; totalPages: number; setPage: (p: number | ((p: number) => number)) => void }> = ({ page, totalPages, setPage }) => (
    totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-5 py-2.5 rounded-full bg-card border border-border text-[14px] text-foreground disabled:opacity-50">Previous</button>
            <span className="text-[14px] text-muted-foreground">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-5 py-2.5 rounded-full bg-card border border-border text-[14px] text-foreground disabled:opacity-50">Next</button>
        </div>
    ) : null
);

const CreateTopicModal: React.FC<{ forums: Forum[]; onClose: () => void; onSubmit: (title: string, content: string, forumSlug: string, tags: string[]) => void; loading: boolean }> = ({ forums, onClose, onSubmit, loading }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [forumSlug, setForumSlug] = useState(forums[0]?.slug || '');
    const [tags, setTags] = useState('');
    const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dialogRef.current?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { title?: string; content?: string } = {};
        if (!title.trim()) newErrors.title = 'Title is required';
        if (title.length > 255) newErrors.title = 'Title must be less than 255 characters';
        if (!content.trim()) newErrors.content = 'Content is required';
        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0) {
            onSubmit(title, content, forumSlug, tags.split(',').map(t => t.trim()).filter(Boolean));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-topic-title"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-[8px] w-full max-w-[640px] max-h-[90vh] overflow-y-auto focus:outline-none"
            >
                <div className="flex items-center justify-between p-8 border-b border-border">
                    <h2 id="create-topic-title" className="text-2xl text-foreground font-semibold">Create New Topic</h2>
                    <button onClick={onClose} aria-label="Close dialog" className="p-2 text-muted-foreground hover:text-foreground rounded-[4px]"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div>
                        <label htmlFor="topic-forum" className="text-[12px] text-muted-foreground uppercase tracking-wide mb-3 block">Forum</label>
                        <select id="topic-forum" value={forumSlug} onChange={(e) => setForumSlug(e.target.value)} className="w-full px-5 py-4 rounded-[8px] bg-muted text-[17px] text-foreground focus:ring-2 focus:ring-primary/20 outline-none">
                            {forums.map(f => <option key={f.id} value={f.slug}>{f.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="topic-title" className="text-[12px] text-muted-foreground uppercase tracking-wide mb-3 block">Title</label>
                        <input id="topic-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your question?" aria-invalid={Boolean(errors.title) || undefined} className={`w-full px-5 py-4 rounded-[8px] bg-muted text-[17px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none ${errors.title ? 'ring-2 ring-error/50' : ''}`} />
                        {errors.title && <p className="text-error text-[14px] mt-2">{errors.title}</p>}
                    </div>
                    <div>
                        <label htmlFor="topic-content" className="text-[12px] text-muted-foreground uppercase tracking-wide mb-3 block">Content</label>
                        <textarea id="topic-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe your topic..." rows={6} aria-invalid={Boolean(errors.content) || undefined} className={`w-full px-5 py-4 rounded-[8px] bg-muted text-[17px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-none ${errors.content ? 'ring-2 ring-error/50' : ''}`} />
                        {errors.content && <p className="text-error text-[14px] mt-2">{errors.content}</p>}
                    </div>
                    <div>
                        <label htmlFor="topic-tags" className="text-[12px] text-muted-foreground uppercase tracking-wide mb-3 block">Tags</label>
                        <input id="topic-tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="marketing, growth, tips" className="w-full px-5 py-4 rounded-[8px] bg-muted text-[17px] text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                    <div className="flex justify-end gap-4 pt-8 border-t border-border">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-full border border-border text-[17px] text-foreground hover:bg-muted transition-all">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-3 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white rounded-full text-[17px] transition-all duration-300 flex items-center gap-2 disabled:opacity-70">
                            {loading && <Loader2 size={18} className="animate-spin" />} {loading ? 'Creating...' : 'Create Topic'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const CommunityPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { getForums, getTopics, getTrendingTopics, getCommunityStars, createTopic, vote, bookmarkTopic, isLoading } = useCommunity();

    const [forums, setForums] = useState<Forum[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [trendingTopics, setTrendingTopics] = useState<Topic[]>([]);
    const [communityStars, setCommunityStars] = useState<CommunityUserStats[]>([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);
    useEffect(() => { loadTopics(); }, [activeFilter, sortBy, page, searchQuery]);

    const loadData = async () => {
        try {
            const [forumsData, trendingData, starsData] = await Promise.all([getForums(), getTrendingTopics(), getCommunityStars()]);
            setForums(forumsData);
            setTrendingTopics(trendingData);
            setCommunityStars(starsData);
        } catch (err) {
            console.error('Failed to load:', err);
            setLoadError('We could not load the community. Please try again.');
        }
    };

    const loadTopics = async () => {
        try {
            setLoadError(null);
            const result = await getTopics({ forum: activeFilter === 'All' ? undefined : activeFilter, sort: sortBy, page, limit: 15, search: searchQuery || undefined });
            setTopics(result.data);
            setTotalPages(result.totalPages);
        } catch (err) {
            console.error('Failed to load:', err);
            setLoadError('We could not load topics. Please try again.');
        }
    };

    const requireAuth = () => { navigate('/auth', { state: { from: location } }); };
    const handleVote = async (topicId: string, currentVote: 'upvote' | 'downvote' | null | undefined) => { if (!user) return requireAuth(); await vote({ targetType: 'topic', targetId: topicId, voteType: currentVote === 'upvote' ? 'downvote' : 'upvote' }); loadTopics(); };
    const handleBookmark = async (topicId: string) => { if (!user) return requireAuth(); await bookmarkTopic(topicId); loadTopics(); };
    const handleCreateTopic = async (title: string, content: string, forumSlug: string, tags: string[]) => { setCreating(true); await createTopic({ title, content, forumSlug, tags }); setShowCreateModal(false); loadTopics(); loadData(); setCreating(false); };
    const handleNewTopic = () => { if (!user) return requireAuth(); setShowCreateModal(true); };
    const retryLoad = () => { loadData(); loadTopics(); };

    const forumFilters = ['All', ...forums.map(forum => forum.slug)];
    const forumBySlug = new Map(forums.map(forum => [forum.slug, forum]));
    const forumById = new Map(forums.map(forum => [forum.id, forum]));
    const getForumLabel = (value: string) => {
        if (value === 'All') return 'All';
        return forumBySlug.get(value)?.name || forumById.get(value)?.name || value;
    };

    // Shared feed block used by both the authed and guest render trees.
    const topicFeed = (
        <>
            {trendingTopics.length > 0 && <TrendingSection topics={trendingTopics} />}
            {loadError && topics.length === 0 ? (
                <ErrorState
                    title="Something went wrong"
                    description={loadError}
                    action={{ label: 'Try again', onClick: retryLoad }}
                />
            ) : isLoading && topics.length === 0 ? (
                <LoadingState variant="skeleton" rows={4} title="Loading topics" />
            ) : topics.length === 0 ? (
                <EmptyState
                    icon={MessageSquare}
                    title="No topics yet"
                    description="Be the first to start a discussion!"
                    action={{ label: 'New Topic', icon: Plus, onClick: handleNewTopic }}
                />
            ) : (
                <div className="space-y-4">
                    {topics.map((topic, index) => (
                        <TopicCard key={topic.id} topic={topic} index={index} onVote={() => handleVote(topic.id, topic.userVote)} onBookmark={() => handleBookmark(topic.id)} forumLabel={getForumLabel(topic.forum?.slug || topic.forumId)} />
                    ))}
                </div>
            )}
            <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </>
    );

    if (user) {
        return (
            <DashboardLayout>
                <div className="flex h-[calc(100vh-44px)]">
                    <AnimatePresence mode="wait">
                        {sidebarOpen && (
                            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="hidden lg:flex flex-col bg-muted overflow-hidden flex-shrink-0">
                                <div className="p-6">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                        <label htmlFor="community-search" className="sr-only">Search topics</label>
                                        <input id="community-search" type="text" placeholder="Search..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="w-full pl-12 pr-4 py-3 rounded-[8px] text-[14px] bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 space-y-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-[12px] text-muted-foreground uppercase tracking-wide">Forums</h3>
                                            <Link to="/community/stars" className="text-[12px] text-primary hover:underline">Leaderboard</Link>
                                        </div>
                                        <nav className="space-y-2">
                                            {forumFilters.map(filter => (
                                                <button key={filter} onClick={() => { setActiveFilter(filter); setPage(1); }} aria-current={activeFilter === filter} className={`w-full flex items-center justify-between px-4 py-3 rounded-[8px] text-[14px] transition-all duration-300 ${activeFilter === filter ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-card'}`}>
                                                    <span>{getForumLabel(filter)}</span>
                                                    {activeFilter === filter && <ChevronRight size={16} />}
                                                </button>
                                            ))}
                                        </nav>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-[12px] text-muted-foreground uppercase tracking-wide">Top Contributors</h3>
                                        <div className="space-y-3">
                                            {communityStars.slice(0, 5).map((stat, i) => (
                                                <Link key={stat.userId} to={`/community/profile/${stat.userId}`} className="flex items-center gap-4 p-3 rounded-[8px] hover:bg-card group">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold ${i === 0 ? 'bg-primary text-white' : i === 2 ? 'bg-primary/60 text-white' : 'bg-card text-muted-foreground'}`}>{i + 1}</span>
                                                    <div className="w-10 h-10 rounded-[4px] bg-primary flex items-center justify-center text-white font-semibold text-[17px]">{stat.user?.fullName?.[0] || '?'}</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[14px] text-foreground truncate group-hover:text-primary">{stat.user?.fullName || 'Unknown'}</p>
                                                        <p className="text-[12px] text-muted-foreground">{stat.reputation} rep</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>

                    <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-card">
                        <header className="flex-shrink-0 p-6 border-b border-border">
                            <div className="max-w-[980px] mx-auto flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} aria-expanded={sidebarOpen} className="p-2 rounded-[4px] hover:bg-muted text-muted-foreground"><Menu size={18} /></button>
                                    <div>
                                        <h1 className="text-foreground text-[40px] font-semibold leading-[1.1]">Community</h1>
                                        <p className="text-[17px] text-muted-foreground hidden sm:block">Join discussions, share knowledge</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label htmlFor="community-sort" className="sr-only">Sort topics</label>
                                    <select id="community-sort" value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }} className="px-4 py-2.5 rounded-[8px] text-[14px] bg-muted text-foreground hidden sm:block border-none focus:ring-2 focus:ring-primary/20 outline-none">
                                        <option value="latest">Latest</option>
                                        <option value="popular">Popular</option>
                                        <option value="trending">Trending</option>
                                    </select>
                                    <button onClick={handleNewTopic} className="px-5 py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white rounded-full text-[14px] transition-all flex items-center gap-2"><Plus size={16} aria-hidden="true" /><span className="hidden sm:inline">New Topic</span></button>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                            <div className="max-w-[980px] mx-auto">
                                {topicFeed}
                            </div>
                        </div>
                    </main>
                </div>

                {showCreateModal && <CreateTopicModal forums={forums} onClose={() => setShowCreateModal(false)} onSubmit={handleCreateTopic} loading={creating} />}
            </DashboardLayout>
        );
    }

    return (
        <Layout>
            <div className="-mt-8 -mx-4 md:-mx-6">
                <section className="bg-foreground min-h-[50dvh] py-20 px-6">
                    <div className="max-w-[980px] mx-auto">
                        <h1 className="text-background text-[56px] md:text-[40px] font-semibold leading-[1.07] tracking-[-0.028em] mb-6">Community.</h1>
                        <p className="text-background/80 text-[21px] leading-[1.19] max-w-[65ch]">Join discussions, share knowledge, and connect with fellow founders and developers.</p>
                    </div>
                </section>

                <section className="bg-primary/10 border border-primary/20 py-8 px-6">
                    <div className="max-w-[980px] mx-auto flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-[8px] flex items-center justify-center"><Lock size={24} className="text-white" aria-hidden="true" /></div>
                            <div>
                                <p className="text-foreground text-[17px] font-semibold">Want to participate?</p>
                                <p className="text-muted-foreground text-[14px]">Sign in to comment, vote, and create topics</p>
                            </div>
                        </div>
                        <button onClick={requireAuth} className="px-6 py-3 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white rounded-full text-[17px] transition-all flex items-center gap-2"><User size={16} aria-hidden="true" /> Sign In</button>
                    </div>
                </section>

                <section className="bg-muted py-12 px-6 border-t border-border">
                    <div className="max-w-[980px] mx-auto">
                        <div className="flex items-center gap-4 mb-8 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                            {forumFilters.map(filter => (
                                <button key={filter} onClick={() => { setActiveFilter(filter); setPage(1); }} aria-current={activeFilter === filter} className={`px-5 py-2.5 rounded-full text-[14px] whitespace-nowrap transition-all ${activeFilter === filter ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'}`}>
                                    {getForumLabel(filter)}
                                </button>
                            ))}
                            <label htmlFor="community-sort-guest" className="sr-only">Sort topics</label>
                            <select id="community-sort-guest" value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }} className="px-4 py-2.5 rounded-[8px] text-[14px] bg-card text-foreground border-none focus:ring-2 focus:ring-primary/20 outline-none">
                                <option value="latest">Latest</option>
                                <option value="popular">Popular</option>
                                <option value="trending">Trending</option>
                            </select>
                        </div>

                        {topicFeed}
                    </div>
                </section>
            </div>
        </Layout>
    );
};
