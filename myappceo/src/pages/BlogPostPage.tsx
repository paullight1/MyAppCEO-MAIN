import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Check,
    Clock3,
    Copy,
    Newspaper,
    Sparkles,
    Tag,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { fetchBlogPostBySlug, fetchPublishedBlogPosts } from '../lib/blog';
import type { BlogContentBlock, BlogPost } from '../types/blog';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { buildBlogCategoryPath, getBlogCategoryTheme, parseBlogBody } from '../utils/blog';
import { formatDate } from '../utils/format';

const renderInlineText = (value: string): React.ReactNode => {
    const nodes: React.ReactNode[] = [];
    const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(value.slice(lastIndex, match.index));
        }

        if (match[2]) {
            nodes.push(<strong key={`bold-${match.index}`}>{match[2]}</strong>);
        } else if (match[3]) {
            nodes.push(<em key={`italic-${match.index}`}>{match[3]}</em>);
        } else if (match[4] && match[5]) {
            nodes.push(
                <a
                    key={`link-${match.index}`}
                    href={match[5]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                >
                    {match[4]}
                </a>,
            );
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) {
        nodes.push(value.slice(lastIndex));
    }

    return nodes.length > 0 ? nodes : value;
};

const renderBodyBlock = (block: BlogContentBlock, index: number) => {
    if (block.type === 'heading') {
        if (block.level === 2) {
            return (
                <h2 key={`heading-2-${index}`} className="mt-10 text-[clamp(1.7rem,2.8vw,2.7rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-foreground first:mt-0">
                    {renderInlineText(block.text)}
                </h2>
            );
        }

        return (
            <h3 key={`heading-3-${index}`} className="mt-8 text-[clamp(1.3rem,2vw,1.7rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground">
                {renderInlineText(block.text)}
            </h3>
        );
    }

    if (block.type === 'paragraph') {
        return (
            <p key={`paragraph-${index}`} className="text-[17px] leading-8 text-foreground/85">
                {renderInlineText(block.text)}
            </p>
        );
    }

    if (block.type === 'quote') {
        return (
            <blockquote key={`quote-${index}`} className="border-l-2 border-primary pl-5 text-[18px] leading-8 text-foreground">
                {renderInlineText(block.text)}
            </blockquote>
        );
    }

    if (block.type === 'divider') {
        return <div key={`divider-${index}`} className="my-8 h-px bg-border" />;
    }

    return (
        <ul key={`list-${index}`} className="space-y-3 pl-5">
            {block.items.map((item) => (
                <li key={item} className="list-disc text-[17px] leading-8 text-foreground/85">
                    {renderInlineText(item)}
                </li>
            ))}
        </ul>
    );
};

const StoryRailCard: React.FC<{ post: BlogPost }> = ({ post }) => {
    const theme = getBlogCategoryTheme(post.category);

    return (
        <Link
            to={`/blog/${post.slug}`}
            className="group block overflow-hidden rounded-[24px] border border-border bg-card p-4 transition-all duration-300 hover:border-primary/40"
        >
            <div className={`relative aspect-[16/10] overflow-hidden rounded-[18px] bg-gradient-to-br ${theme.accent}`}>
                {post.coverImageUrl ? (
                    <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${theme.badge}`}>
                    {post.category}
                </span>
            </div>

            <h3 className="mt-4 line-clamp-2 text-[17px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
                {post.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-muted-foreground">{post.excerpt}</p>
        </Link>
    );
};

export const BlogPostPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!slug) return;
            try {
                setIsLoading(true);
                setError(null);
                // Fetch the single requested post directly instead of loading every post.
                const current = await fetchBlogPostBySlug(slug);
                if (!mounted) return;
                setPost(current);

                if (current) {
                    const all = await fetchPublishedBlogPosts();
                    if (!mounted) return;
                    const sameCategory = all.filter((entry) => entry.id !== current.id && entry.category === current.category);
                    const fallback = all.filter((entry) => entry.id !== current.id && entry.category !== current.category);
                    setRelatedPosts([...sameCategory, ...fallback].slice(0, 3));
                } else {
                    setRelatedPosts([]);
                }
            } catch (err) {
                if (!mounted) return;
                setPost(null);
                setRelatedPosts([]);
                setError(err instanceof Error ? err.message : 'Failed to load blog post.');
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, [slug]);

    const blocks = useMemo(
        () => (post ? parseBlogBody(post.body) : []),
        [post],
    );

    const handleCopyLink = async () => {
        if (typeof window === 'undefined') return;
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopyFailed(false);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopyFailed(true);
            window.setTimeout(() => setCopyFailed(false), 2400);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
                    <LoadingState title="Loading article…" description="Fetching the story and related reading." />
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
                    <ErrorState
                        title="Unable to load article"
                        description={error}
                        action={{ label: 'Try again', onClick: () => window.location.reload() }}
                        secondaryAction={{ label: 'Back to blog', href: '/blog', icon: ArrowLeft }}
                    />
                </div>
            </Layout>
        );
    }

    if (!post) {
        return (
            <Layout>
                <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
                    <EmptyState
                        icon={Sparkles}
                        title="Article not found"
                        description="The article may have been moved, unpublished, or the URL may be incorrect."
                        action={{ label: 'Back to blog', href: '/blog', icon: ArrowLeft }}
                    />
                </div>
            </Layout>
        );
    }

    const theme = getBlogCategoryTheme(post.category);

    return (
        <Layout>
            <div className="relative overflow-hidden bg-background text-foreground">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />

                <section className="relative mx-auto max-w-[1400px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-16">
                    <div className="mb-8 flex items-center justify-between gap-4">
                        <Link
                            to="/blog"
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-[13px] font-semibold text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-primary"
                        >
                            <ArrowLeft size={14} /> Back to blog
                        </Link>
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            aria-label="Copy link to this article"
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-[13px] font-semibold text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-primary"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied' : copyFailed ? 'Copy failed' : 'Copy link'}
                        </button>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                        <article className="overflow-hidden rounded-[32px] border border-border bg-card">
                            <div className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${theme.accent}`}>
                                {post.coverImageUrl ? (
                                    <img
                                        src={post.coverImageUrl}
                                        alt={post.coverImageAlt || post.title}
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                ) : null}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                                <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-7">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link
                                            to={buildBlogCategoryPath(post.category)}
                                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-transform hover:scale-[1.02] ${theme.badge}`}
                                        >
                                            {post.category}
                                        </Link>
                                        {post.featured ? (
                                            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur">
                                                Featured
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="space-y-3">
                                        <h1 className="max-w-4xl font-serif text-[clamp(2.5rem,5vw,5.8rem)] leading-[0.9] tracking-[-0.055em]">
                                            {post.title}
                                        </h1>
                                        <p className="max-w-3xl text-[16px] leading-7 text-white/80 sm:text-[18px]">
                                            {post.excerpt}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-6 sm:px-7">
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Newspaper size={14} /> {post.authorName}
                                    </span>
                                    <span>{post.authorTitle || 'Editorial desk'}</span>
                                    <span>{formatDate(post.publishedAt)}</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock3 size={14} /> {post.readingTimeMinutes} min read
                                    </span>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {post.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                                        >
                                            <Tag size={11} /> {tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-8 space-y-6">
                                    {blocks.map((block, index) => renderBodyBlock(block, index))}
                                </div>
                            </div>
                        </article>

                        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-[24px] border border-primary/20 bg-primary p-5 text-primary-foreground">
                                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                                    <Sparkles size={18} />
                                </div>
                                <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.02em]">Why this story exists</h2>
                                <p className="mt-3 text-[14px] leading-6 text-primary-foreground/80">
                                    The blog documents the product decisions, launch notes, and operating details behind the platform.
                                </p>
                            </div>

                            <div className="rounded-[24px] border border-border bg-card p-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Article details</p>
                                <dl className="mt-4 space-y-4">
                                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                                        <dt className="text-[13px] text-muted-foreground">Category</dt>
                                        <dd className="text-[13px] font-semibold text-foreground">
                                            <Link to={buildBlogCategoryPath(post.category)} className="text-primary transition-colors hover:text-primary/80 hover:underline">
                                                {post.category}
                                            </Link>
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                                        <dt className="text-[13px] text-muted-foreground">Published</dt>
                                        <dd className="text-[13px] font-semibold text-foreground">{formatDate(post.publishedAt)}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-[13px] text-muted-foreground">Read time</dt>
                                        <dd className="text-[13px] font-semibold text-foreground">{post.readingTimeMinutes} minutes</dd>
                                    </div>
                                </dl>
                            </div>

                            {relatedPosts.length > 0 && (
                                <div className="rounded-[24px] border border-border bg-card p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Related stories</p>
                                    <div className="mt-4 space-y-4">
                                        {relatedPosts.map((relatedPost) => (
                                            <StoryRailCard key={relatedPost.id} post={relatedPost} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </aside>
                    </div>
                </section>
            </div>
        </Layout>
    );
};
