import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Clock3,
    Newspaper,
    Sparkles,
    Tag,
    TrendingUp,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { fetchPublishedBlogPosts } from '../lib/blog';
import type { BlogPost } from '../types/blog';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import {
    BLOG_CATEGORY_THEMES,
    buildBlogCategoryPath,
    formatBlogCategoryLabel,
    getBlogCategoryTheme,
    slugify,
} from '../utils/blog';
import { formatDate } from '../utils/format';

const POSTS_PER_PAGE = 6;

const HERO_COPY = {
    eyebrow: 'Editorial / Updates',
    title: 'Product notes, launch stories, and the decisions behind the build.',
    body: 'Read short, specific posts about what shipped, what changed, and why the product team chose that path.',
};

const pillClass = (isActive: boolean) =>
    `rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${isActive
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
    }`;

const topicRowClass = (isActive: boolean) =>
    `flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-all ${isActive
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-muted/40 text-foreground hover:border-primary/30 hover:bg-primary/5'
    }`;

const LoadingGrid = () => (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[30px] border border-border bg-card p-6">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="mt-6 h-14 w-4/5 rounded-2xl" />
            <Skeleton className="mt-4 h-4 w-full rounded-full" />
            <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
            <Skeleton className="mt-8 h-[360px] rounded-[24px]" />
        </div>
        <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-[24px] border border-border bg-card p-5">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="mt-4 h-6 w-4/5 rounded-full" />
                    <Skeleton className="mt-3 h-4 w-full rounded-full" />
                    <Skeleton className="mt-2 h-4 w-3/4 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

const ArticleCard: React.FC<{ post: BlogPost; featured?: boolean }> = ({ post, featured = false }) => {
    const theme = getBlogCategoryTheme(post.category);

    return (
        <Link
            to={`/blog/${post.slug}`}
            className={`group block overflow-hidden rounded-[28px] border border-border bg-card transition-all duration-300 hover:border-primary/40 ${featured ? 'lg:col-span-2' : ''}`}
        >
            <div className={`relative overflow-hidden ${featured ? 'aspect-[16/9]' : 'aspect-[16/11]'} bg-gradient-to-br ${theme.accent}`}>
                {post.coverImageUrl ? (
                    <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${theme.badge}`}>
                            {post.category}
                        </span>
                        {post.featured ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur">
                                <Sparkles size={11} /> Featured
                            </span>
                        ) : null}
                    </div>

                    <div className="max-w-3xl space-y-3">
                        <h2 className={`${featured ? 'text-[clamp(2rem,4vw,4.4rem)]' : 'text-[clamp(1.55rem,2.6vw,2.5rem)]'} font-serif leading-[0.94] tracking-[-0.05em]`}>
                            {post.title}
                        </h2>
                        <p className={`max-w-2xl ${featured ? 'text-[16px] sm:text-[18px]' : 'text-[14px]'} leading-7 text-white/80`}>
                            {post.excerpt}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={13} /> {post.readingTimeMinutes} min read
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Newspaper size={13} /> {post.authorName}
                    </span>
                    <span>{formatDate(post.publishedAt)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                        >
                            <Tag size={11} /> {tag}
                        </span>
                    ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                    <p className="text-[13px] font-medium text-muted-foreground">
                        {post.authorTitle || 'Editorial desk'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary">
                        Read story <ArrowRight size={15} />
                    </span>
                </div>
            </div>
        </Link>
    );
};

const CompactStory: React.FC<{ post: BlogPost }> = ({ post }) => {
    const theme = getBlogCategoryTheme(post.category);

    return (
        <Link
            to={`/blog/${post.slug}`}
            className="group flex gap-4 rounded-[22px] border border-border bg-card p-4 transition-all duration-300 hover:border-primary/40"
        >
            <div className={`relative w-24 shrink-0 overflow-hidden rounded-[18px] bg-gradient-to-br ${theme.accent}`}>
                {post.coverImageUrl ? (
                    <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span className={`rounded-full px-2 py-0.5 ${theme.badge}`}>{post.category}</span>
                    <span>{post.readingTimeMinutes} min</span>
                </div>
                <h3 className="mt-2 line-clamp-2 text-[17px] font-semibold leading-[1.18] tracking-[-0.02em] text-foreground">
                    {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-muted-foreground">
                    {post.excerpt}
                </p>
                <div className="mt-3 flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>{post.authorName}</span>
                    <span>{formatDate(post.publishedAt)}</span>
                </div>
            </div>
        </Link>
    );
};

const RailCard: React.FC<{ title: string; body: string; icon: React.ReactNode }> = ({ title, body, icon }) => (
    <div className="rounded-[24px] border border-primary/20 bg-primary p-5 text-primary-foreground">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            {icon}
        </div>
        <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-3 text-[14px] leading-6 text-primary-foreground/80">{body}</p>
    </div>
);

const PaginationBar: React.FC<{
    basePath: string;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    buildPagePath: (page: number) => string;
}> = ({ currentPage, totalPages, totalItems, pageSize, buildPagePath }) => {
    if (totalPages <= 1 || totalItems === 0) {
        return null;
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    const actionClass = 'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-200';
    const enabledClass = 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary';
    const disabledClass = 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground/50';

    return (
        <nav aria-label="Pagination" className="mt-8 flex flex-col gap-4 rounded-[24px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted-foreground">
                Showing {start}-{end} of {totalItems} posts
            </p>

            <div className="flex items-center gap-3">
                {currentPage > 1 ? (
                    <Link to={buildPagePath(currentPage - 1)} rel="prev" className={`${actionClass} ${enabledClass}`}>
                        <ArrowLeft size={14} /> Previous
                    </Link>
                ) : (
                    <span aria-disabled="true" className={`${actionClass} ${disabledClass}`}>
                        <ArrowLeft size={14} /> Previous
                    </span>
                )}

                <span className="text-[13px] font-semibold text-foreground">
                    Page {currentPage} of {totalPages}
                </span>

                {currentPage < totalPages ? (
                    <Link to={buildPagePath(currentPage + 1)} rel="next" className={`${actionClass} ${enabledClass}`}>
                        Next <ArrowRight size={14} />
                    </Link>
                ) : (
                    <span aria-disabled="true" className={`${actionClass} ${disabledClass}`}>
                        Next <ArrowRight size={14} />
                    </span>
                )}
            </div>
        </nav>
    );
};

export const BlogPage: React.FC = () => {
    const { category: categoryParam } = useParams<{ category?: string }>();
    const [searchParams] = useSearchParams();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await fetchPublishedBlogPosts();
                if (!mounted) return;
                setPosts(data);
            } catch (err) {
                if (!mounted) return;
                setPosts([]);
                setError(err instanceof Error ? err.message : 'Failed to load blog posts.');
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, []);

    const categories = useMemo(() => {
        const categoryMap = new Map<string, string>();

        posts.forEach((post) => {
            const value = post.category.trim();
            if (!value) return;

            const key = slugify(value);
            if (!categoryMap.has(key)) {
                categoryMap.set(key, value);
            }
        });

        return ['All', ...categoryMap.values()];
    }, [posts]);

    const topicCounts = useMemo(
        () => posts.reduce<Record<string, number>>((acc, post) => {
            const key = slugify(post.category);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {}),
        [posts],
    );

    const activeCategorySlug = useMemo(() => (categoryParam ? slugify(categoryParam) : null), [categoryParam]);

    const activeCategory = useMemo(() => {
        if (!activeCategorySlug) return null;
        return categories.find((category) => category !== 'All' && slugify(category) === activeCategorySlug) ?? null;
    }, [activeCategorySlug, categories]);

    const activeCategoryLabel = activeCategory ?? (activeCategorySlug ? formatBlogCategoryLabel(activeCategorySlug) : 'All');

    const filteredPosts = useMemo(() => {
        if (!activeCategorySlug) return posts;
        return posts.filter((post) => slugify(post.category) === activeCategorySlug);
    }, [activeCategorySlug, posts]);

    const featuredPost = useMemo(
        () => filteredPosts.find((post) => post.featured) ?? filteredPosts[0] ?? null,
        [filteredPosts],
    );

    const remainingPosts = useMemo(
        () => filteredPosts.filter((post) => post.id !== featuredPost?.id),
        [featuredPost?.id, filteredPosts],
    );

    const rawPage = Number(searchParams.get('page') || '1');
    const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const totalPages = Math.max(1, Math.ceil(remainingPosts.length / POSTS_PER_PAGE));
    const currentPage = Math.min(requestedPage, totalPages);
    const pageStart = (currentPage - 1) * POSTS_PER_PAGE;
    const pagePosts = remainingPosts.slice(pageStart, pageStart + POSTS_PER_PAGE);
    const spotlightPosts = pagePosts.slice(0, 3);
    const archivePosts = pagePosts.slice(3);
    const archivePath = activeCategorySlug ? buildBlogCategoryPath(activeCategoryLabel) : '/blog';

    const buildPagePath = (page: number) => {
        if (page <= 1) return archivePath;
        const params = new URLSearchParams();
        params.set('page', String(page));
        return `${archivePath}?${params.toString()}`;
    };

    const heroEyebrow = activeCategorySlug ? `Editorial / ${activeCategoryLabel}` : HERO_COPY.eyebrow;
    const heroTitle = activeCategorySlug ? `${activeCategoryLabel} archive` : HERO_COPY.title;
    const heroBody = activeCategorySlug
        ? `Browse the ${activeCategoryLabel.toLowerCase()} archive and catch up on product notes, launches, and operating updates.`
        : HERO_COPY.body;
    const emptyHeroTitle = activeCategorySlug ? `No posts in ${activeCategoryLabel} yet` : 'No featured story yet';
    const emptyHeroBody = activeCategorySlug
        ? `Publish a post from the admin blog editor and it will appear in the ${activeCategoryLabel.toLowerCase()} archive.`
        : 'Create a published post in the admin blog editor and it will appear here automatically.';
    const listKicker = activeCategorySlug ? `${activeCategoryLabel} archive` : 'Latest stories';
    const listTitle = activeCategorySlug
        ? `Fresh posts from the ${activeCategoryLabel.toLowerCase()} archive`
        : 'Fresh posts from the product desk';
    const articleCount = filteredPosts.length;
    const topicCount = categories.length - 1;

    return (
        <Layout>
            <div className="relative overflow-hidden bg-background text-foreground">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />

                <section className="relative mx-auto max-w-[1400px] px-4 pb-6 pt-10 sm:px-6 lg:px-8 lg:pt-16">
                    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                        <div className="space-y-6">
                            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                                <Newspaper size={14} /> {heroEyebrow}
                            </span>
                            <h1 className="max-w-3xl font-serif text-[clamp(3rem,7vw,6.6rem)] leading-[0.92] tracking-[-0.055em] text-foreground">
                                {heroTitle}
                            </h1>
                            <p className="max-w-2xl text-[17px] leading-8 text-muted-foreground">
                                {heroBody}
                            </p>

                            <nav aria-label="Blog categories" className="flex flex-wrap items-center gap-3">
                                <Link
                                    to="/blog"
                                    aria-current={!activeCategorySlug ? 'page' : undefined}
                                    className={pillClass(!activeCategorySlug)}
                                >
                                    All
                                </Link>
                                {categories.filter((category) => category !== 'All').map((category) => {
                                    const isActive = slugify(category) === activeCategorySlug;

                                    return (
                                        <Link
                                            key={category}
                                            to={buildBlogCategoryPath(category)}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={pillClass(isActive)}
                                        >
                                            {category}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="rounded-[32px] border border-border bg-card/90 p-4 backdrop-blur">
                            {featuredPost ? (
                                <div className="overflow-hidden rounded-[24px] border border-border">
                                    <div className={`relative aspect-[16/10] bg-gradient-to-br ${getBlogCategoryTheme(featuredPost.category).accent}`}>
                                        {featuredPost.coverImageUrl ? (
                                            <img
                                                src={featuredPost.coverImageUrl}
                                                alt={featuredPost.coverImageAlt || featuredPost.title}
                                                className="absolute inset-0 h-full w-full object-cover"
                                            />
                                        ) : null}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                                        <div className="relative flex h-full flex-col justify-between p-5 text-white sm:p-6">
                                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getBlogCategoryTheme(featuredPost.category).badge}`}>
                                                Featured story
                                            </span>
                                            <div className="space-y-3">
                                                <h2 className="max-w-[18ch] font-serif text-[clamp(2rem,4vw,3.8rem)] leading-[0.92] tracking-[-0.055em]">
                                                    {featuredPost.title}
                                                </h2>
                                                <p className="max-w-lg text-[15px] leading-7 text-white/80">
                                                    {featuredPost.excerpt}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-muted-foreground">
                                            <span>{featuredPost.authorName}</span>
                                            <span>{formatDate(featuredPost.publishedAt)}</span>
                                            <span>{featuredPost.readingTimeMinutes} min read</span>
                                        </div>
                                        <Link
                                            to={`/blog/${featuredPost.slug}`}
                                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                                        >
                                            Read featured story <ArrowRight size={15} />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-border bg-muted/40 p-8 text-center">
                                    <div className="max-w-sm space-y-3">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <Sparkles size={18} />
                                        </div>
                                        <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-foreground">{emptyHeroTitle}</h2>
                                        <p className="text-[14px] leading-7 text-muted-foreground">
                                            {emptyHeroBody}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="relative mx-auto max-w-[1400px] px-4 pb-8 sm:px-6 lg:px-8">
                    <div className="grid gap-4 rounded-[30px] border border-primary/20 bg-primary p-6 text-primary-foreground lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">Editorial note</p>
                            <h2 className="mt-3 max-w-3xl text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[38px]">
                                Short posts, specific outcomes, and the work behind the release.
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[20px] border border-white/15 bg-white/10 p-4">
                                <p className="text-[12px] uppercase tracking-[0.16em] text-primary-foreground/70">Published</p>
                                <p className="mt-2 text-[26px] font-semibold">{articleCount}</p>
                            </div>
                            <div className="rounded-[20px] border border-white/15 bg-white/10 p-4">
                                <p className="text-[12px] uppercase tracking-[0.16em] text-primary-foreground/70">Topics</p>
                                <p className="mt-2 text-[26px] font-semibold">{topicCount}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <LoadingGrid />
                    ) : error ? (
                        <ErrorState
                            title="Unable to load the blog"
                            description={error}
                            action={{ label: 'Try again', onClick: () => window.location.reload() }}
                        />
                    ) : filteredPosts.length === 0 ? (
                        <EmptyState
                            icon={TrendingUp}
                            title={activeCategorySlug ? `No posts in ${activeCategoryLabel} yet` : 'No posts yet'}
                            description={
                                activeCategorySlug
                                    ? 'Switch archives or publish a new article from the admin blog editor.'
                                    : 'Publish a new article from the admin blog editor to populate the archive.'
                            }
                            action={activeCategorySlug ? { label: 'View all stories', href: '/blog' } : undefined}
                        />
                    ) : (
                        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                            <div className="space-y-6">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{listKicker}</p>
                                        <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-foreground">
                                            {listTitle}
                                        </h2>
                                    </div>
                                    <p className="text-[13px] text-muted-foreground">{articleCount} articles</p>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {spotlightPosts.length ? spotlightPosts.map((post, index) => (
                                        <ArticleCard key={post.id} post={post} featured={index === 0} />
                                    )) : (
                                        <div className="rounded-[24px] border border-dashed border-border bg-card p-8 text-muted-foreground md:col-span-2">
                                            No additional stories in this view.
                                        </div>
                                    )}
                                </div>

                                {archivePosts.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">Archive</h3>
                                            <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">More reading</p>
                                        </div>
                                        <div className="grid gap-4">
                                            {archivePosts.map((post) => (
                                                <CompactStory key={post.id} post={post} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <PaginationBar
                                    basePath={archivePath}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={remainingPosts.length}
                                    pageSize={POSTS_PER_PAGE}
                                    buildPagePath={buildPagePath}
                                />
                            </div>

                            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                                <RailCard
                                    title="Built for product updates"
                                    body="Use the admin editor to publish launch notes, roadmap notes, product essays, and company updates without leaving the dashboard."
                                    icon={<Sparkles size={18} />}
                                />

                                <div className="rounded-[24px] border border-border bg-card p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Topics</p>
                                    <div className="mt-4 space-y-3">
                                        <Link
                                            to="/blog"
                                            aria-current={!activeCategorySlug ? 'page' : undefined}
                                            className={topicRowClass(!activeCategorySlug)}
                                        >
                                            <span className="inline-flex items-center gap-2 text-[14px] font-semibold">All stories</span>
                                            <span className="text-[12px] font-medium opacity-70">{posts.length}</span>
                                        </Link>
                                        {categories.filter((category) => category !== 'All').map((category) => {
                                            const count = topicCounts[slugify(category)] || 0;
                                            const theme = BLOG_CATEGORY_THEMES[category] || BLOG_CATEGORY_THEMES.Default;
                                            const isActive = slugify(category) === activeCategorySlug;

                                            return (
                                                <Link
                                                    key={category}
                                                    to={buildBlogCategoryPath(category)}
                                                    aria-current={isActive ? 'page' : undefined}
                                                    className={topicRowClass(isActive)}
                                                >
                                                    <span className="inline-flex items-center gap-2 text-[14px] font-semibold">
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.badge}`}>
                                                            {category.slice(0, 2)}
                                                        </span>
                                                        {category}
                                                    </span>
                                                    <span className="text-[12px] font-medium opacity-70">{count}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>

                                <RailCard
                                    title="Read the archive, then build"
                                    body="The blog mirrors the product surface: concise, trustworthy, and specific enough for buyers, founders, and operators to act on."
                                    icon={<Clock3 size={18} />}
                                />
                            </aside>
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    );
};
