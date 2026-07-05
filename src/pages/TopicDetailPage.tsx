import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    ArrowLeft,
    MessageCircle,
    Heart,
    Share2,
    Bookmark,
    BookmarkCheck,
    Check,
    Send,
    Loader2,
    ChevronUp,
    ChevronDown,
    CornerDownRight,
    X,
    Edit2,
    Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCommunity, Topic, Post } from '../hooks/useCommunity';
import { useAuth } from '../hooks/useAuth';
import { LoadingState, EmptyState, ErrorState } from '../components/ui';
import { formatRelativeTime } from '../utils/format';

export const TopicDetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { user } = useAuth();
    const {
        getTopicBySlug,
        getPosts,
        createPost,
        updatePost,
        deletePost,
        acceptAnswer,
        vote,
        bookmarkTopic,
        isLoading,
        error
    } = useCommunity();

    const [topic, setTopic] = useState<Topic | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [replyContent, setReplyContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        if (slug) loadData();
    }, [slug]);

    const loadData = async () => {
        if (!slug) return;
        try {
            const topicData = await getTopicBySlug(slug);
            const postsData = await getPosts(topicData.id);
            setTopic(topicData);
            setPosts(postsData);
        } catch (err) {
            console.error('Failed to load topic:', err);
        }
    };

    const handleSubmitReply = async () => {
        if (!replyContent.trim() || !topic) return;
        setSubmitting(true);
        try {
            await createPost(topic.id, {
                content: replyContent,
                parentId: replyingTo || undefined
            });
            setReplyContent('');
            setReplyingTo(null);
            const postsData = await getPosts(topic.id);
            setPosts(postsData);
        } catch (err) {
            console.error('Failed to create post:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (targetId: string, currentVote: 'upvote' | 'downvote' | null | undefined, targetType: 'topic' | 'post' = 'post') => {
        const voteType = currentVote === 'upvote' ? 'downvote' : 'upvote';
        try {
            await vote({ targetType, targetId, voteType });
            if (targetType === 'topic') {
                loadData();
            } else {
                const postsData = await getPosts(topic!.id);
                setPosts(postsData);
            }
        } catch (err) {
            console.error('Failed to vote:', err);
        }
    };

    const handleBookmark = async () => {
        if (!topic) return;
        try {
            await bookmarkTopic(topic.id);
            setTopic({ ...topic, isBookmarked: !topic.isBookmarked });
        } catch (err) {
            console.error('Failed to bookmark:', err);
        }
    };

    const handleAcceptAnswer = async (postId: string) => {
        try {
            await acceptAnswer(postId);
            const postsData = await getPosts(topic!.id);
            setPosts(postsData);
            setTopic({ ...topic!, isSolved: true });
        } catch (err) {
            console.error('Failed to accept answer:', err);
        }
    };

    const handleEditPost = async (postId: string) => {
        if (!editContent.trim()) return;
        try {
            await updatePost(postId, { content: editContent });
            setEditingPostId(null);
            setEditContent('');
            const postsData = await getPosts(topic!.id);
            setPosts(postsData);
        } catch (err) {
            console.error('Failed to update post:', err);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            await deletePost(postId);
            const postsData = await getPosts(topic!.id);
            setPosts(postsData);
        } catch (err) {
            console.error('Failed to delete post:', err);
        }
    };

    const buildThreadedPosts = (flatPosts: Post[]): Post[] => {
        const postMap = new Map<string, Post>();
        const rootPosts: Post[] = [];

        flatPosts.forEach(post => {
            postMap.set(post.id, { ...post, replies: [] });
        });

        flatPosts.forEach(post => {
            const postWithReplies = postMap.get(post.id)!;
            if (post.parentId) {
                const parent = postMap.get(post.parentId);
                if (parent) {
                    parent.replies = parent.replies || [];
                    parent.replies.push(postWithReplies);
                }
            } else {
                rootPosts.push(postWithReplies);
            }
        });

        return rootPosts;
    };

    if (isLoading && !topic) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-12">
                    <LoadingState title="Loading topic" />
                </div>
            </DashboardLayout>
        );
    }

    if (!topic) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-20">
                    {error ? (
                        <ErrorState
                            title="Couldn't load this topic"
                            description="Something went wrong while fetching the discussion."
                            detail={error}
                            action={{ label: 'Try again', onClick: loadData }}
                            secondaryAction={{ label: 'Back to Community', href: '/community' }}
                        />
                    ) : (
                        <EmptyState
                            title="Topic not found"
                            description="This discussion may have been removed or the link is incorrect."
                            action={{ label: 'Back to Community', href: '/community' }}
                        />
                    )}
                </div>
            </DashboardLayout>
        );
    }

    const threadedPosts = buildThreadedPosts(posts);

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Link
                    to="/community"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Community
                </Link>

                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                {topic.author?.fullName?.[0] || '?'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">{topic.author?.fullName || 'Unknown'}</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-primary uppercase tracking-widest">CEO</span>
                                    <span className="w-1 h-1 bg-muted rounded-full" />
                                    <span className="text-xs font-bold text-muted-foreground">{formatRelativeTime(topic.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {topic.isSolved && (
                                <span className="px-3 py-1 bg-success/15 text-success text-xs font-bold rounded-full flex items-center gap-1">
                                    <Check size={14} aria-hidden="true" /> Solved
                                </span>
                            )}
                            {topic.isPinned && (
                                <span className="px-3 py-1 bg-warning/15 text-warning text-xs font-bold rounded-full">
                                    Pinned
                                </span>
                            )}
                            <button
                                onClick={handleBookmark}
                                aria-label={topic.isBookmarked ? 'Remove bookmark' : 'Bookmark topic'}
                                aria-pressed={topic.isBookmarked}
                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            >
                                {topic.isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                            </button>
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-foreground mb-4">{topic.title}</h1>
                    <div className="prose dark:prose-invert max-w-none text-muted-foreground mb-6">
                        <p className="whitespace-pre-wrap">{topic.content}</p>
                    </div>

                    {topic.tags && topic.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {topic.tags.map(tag => (
                                <span key={tag} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-border">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => handleVote(topic.id, topic.userVote, 'topic')}
                                aria-label={topic.userVote === 'upvote' ? 'Remove upvote' : 'Upvote'}
                                aria-pressed={topic.userVote === 'upvote'}
                                className={`flex items-center gap-2 transition-colors ${topic.userVote === 'upvote' ? 'text-error' : 'text-muted-foreground hover:text-error'}`}
                            >
                                <Heart size={20} className={topic.userVote === 'upvote' ? 'fill-current' : ''} />
                                <span className="font-medium">{topic.upvotes || 0}</span>
                            </button>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MessageCircle size={20} aria-hidden="true" />
                                <span className="font-medium">{topic.replyCount || 0} replies</span>
                            </div>
                            <div className="text-muted-foreground text-sm">
                                {topic.viewCount || 0} views
                            </div>
                        </div>
                        <button
                            aria-label="Share topic"
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Share2 size={18} /> Share
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground">
                        {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
                    </h3>

                    {posts.length === 0 ? (
                        <EmptyState
                            icon={MessageCircle}
                            size="sm"
                            title="No replies yet"
                            description="Be the first to respond to this discussion!"
                        />
                    ) : (
                        <div className="space-y-4">
                            {threadedPosts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    topicAuthorId={topic.userId}
                                    currentUserId={user?.id}
                                    onVote={handleVote}
                                    onReply={(postId) => { setReplyingTo(postId); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
                                    onEdit={(postId, content) => { setEditingPostId(postId); setEditContent(content); }}
                                    onDelete={handleDeletePost}
                                    onAccept={handleAcceptAnswer}
                                    depth={0}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {user && !topic.isLocked && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                        {replyingTo && (
                            <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-xl">
                                <span className="text-sm text-muted-foreground">
                                    Replying to a post
                                </span>
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    aria-label="Cancel reply"
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                                {user.fullName?.[0] || user.email?.[0] || '?'}
                            </div>
                            <div className="flex-1">
                                <label htmlFor="reply-input" className="sr-only">Write your reply</label>
                                <textarea
                                    id="reply-input"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Write your reply..."
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground resize-none"
                                />
                                <div className="flex justify-end mt-3">
                                    <button
                                        onClick={handleSubmitReply}
                                        disabled={!replyContent.trim() || submitting}
                                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting && <Loader2 size={18} className="animate-spin" />}
                                        {submitting ? 'Posting...' : <><Send size={18} /> Post Reply</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {topic.isLocked && (
                    <div className="bg-muted border border-border rounded-2xl p-6 text-center">
                        <p className="text-muted-foreground">This topic is locked and no longer accepts replies.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

interface PostCardProps {
    post: Post;
    topicAuthorId: string;
    currentUserId?: string;
    onVote: (postId: string, currentVote: 'upvote' | 'downvote' | null | undefined) => void;
    onReply: (postId: string) => void;
    onEdit: (postId: string, content: string) => void;
    onDelete: (postId: string) => void;
    onAccept: (postId: string) => void;
    depth: number;
}

const PostCard: React.FC<PostCardProps> = ({
    post,
    topicAuthorId,
    currentUserId,
    onVote,
    onReply,
    onEdit,
    onDelete,
    onAccept,
    depth
}) => {
    const [showReplies, setShowReplies] = useState(depth < 2);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-card border border-border rounded-2xl p-5 ${post.isAcceptedAnswer ? 'border-success/50' : ''}`}
        >
            {post.isAcceptedAnswer && (
                <div className="flex items-center gap-2 mb-3 text-success text-sm font-bold">
                    <Check size={16} aria-hidden="true" /> Accepted Answer
                </div>
            )}

            <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => onVote(post.id, post.userVote)}
                        aria-label="Upvote"
                        aria-pressed={post.userVote === 'upvote'}
                        className={`p-1.5 rounded-lg transition-colors ${post.userVote === 'upvote' ? 'text-error bg-error/10' : 'text-muted-foreground hover:text-error hover:bg-error/10'}`}
                    >
                        <ChevronUp size={20} />
                    </button>
                    <span className={`text-sm font-bold ${post.voteCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {post.voteCount || 0}
                    </span>
                    <button
                        onClick={() => onVote(post.id, post.userVote)}
                        aria-label="Downvote"
                        aria-pressed={post.userVote === 'downvote'}
                        className={`p-1.5 rounded-lg transition-colors ${post.userVote === 'downvote' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                            {post.author?.fullName?.[0] || '?'}
                        </div>
                        <div>
                            <span className="font-bold text-foreground text-sm">{post.author?.fullName || 'Unknown'}</span>
                            <span className="text-muted-foreground text-xs ml-2">{formatRelativeTime(post.createdAt)}</span>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none text-muted-foreground text-sm mb-4">
                        <p className="whitespace-pre-wrap">{post.content}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onReply(post.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <CornerDownRight size={14} aria-hidden="true" /> Reply
                        </button>

                        {currentUserId === topicAuthorId && !post.isAcceptedAnswer && depth === 0 && (
                            <button
                                onClick={() => onAccept(post.id)}
                                className="flex items-center gap-1.5 text-xs text-success hover:text-success/80 transition-colors"
                            >
                                <Check size={14} aria-hidden="true" /> Accept Answer
                            </button>
                        )}

                        {currentUserId === post.userId && (
                            <>
                                <button
                                    onClick={() => onEdit(post.id, post.content)}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Edit2 size={14} aria-hidden="true" /> Edit
                                </button>
                                <button
                                    onClick={() => onDelete(post.id)}
                                    className="flex items-center gap-1.5 text-xs text-error hover:text-error/80 transition-colors"
                                >
                                    <Trash2 size={14} aria-hidden="true" /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {post.replies && post.replies.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-border">
                    {depth < 2 && (
                        <button
                            onClick={() => setShowReplies(!showReplies)}
                            className="text-xs text-primary hover:underline mb-3"
                        >
                            {showReplies ? 'Hide' : 'Show'} {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                    )}
                    {showReplies && post.replies.map(reply => (
                        <PostCard
                            key={reply.id}
                            post={reply}
                            topicAuthorId={topicAuthorId}
                            currentUserId={currentUserId}
                            onVote={onVote}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAccept={onAccept}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};
