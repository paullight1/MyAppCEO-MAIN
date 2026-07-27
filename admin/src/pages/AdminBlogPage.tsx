import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    Bold,
    CalendarDays,
    CheckCircle2,
    ExternalLink,
    Heading2,
    Heading3,
    Italic,
    Layers,
    Link2,
    Loader2,
    Minus,
    Newspaper,
    Plus,
    Quote,
    List,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button, ConfirmDialog, EmptyState, FormField, StatTile } from '../components/ui';
import {
    createBlogPost,
    deleteBlogPost,
    fetchAdminBlogPosts,
    updateBlogPost,
    buildBlogExcerpt,
} from '../lib/blog';
import type { BlogPost, BlogPostInput, BlogPostStatus } from '../types/blog';
import {
    estimateReadingTime,
    formatBlogDate,
    getBlogCategoryTheme,
    slugify,
} from '../utils/blog';
import { cn } from '../utils/cn';

type BlogFormState = {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    category: string;
    status: BlogPostStatus;
    featured: boolean;
    authorName: string;
    authorTitle: string;
    coverImageUrl: string;
    coverImageAlt: string;
    tags: string;
    publishedAt: string | null;
};

type BodySelectionUpdate = {
    body: string;
    selectionStart: number;
    selectionEnd: number;
};

const DEFAULT_FORM: BlogFormState = {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    category: 'Product',
    status: 'draft',
    featured: false,
    authorName: 'MVPLAB Editorial',
    authorTitle: 'Product desk',
    coverImageUrl: '',
    coverImageAlt: '',
    tags: '',
    publishedAt: null,
};

// Dark-safe status tint pills (StatusBadge has no blog "kind").
const STATUS_META: Record<BlogPostStatus, { label: string; tone: string }> = {
    draft: { label: 'Draft', tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
    scheduled: { label: 'Scheduled', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    published: { label: 'Published', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    archived: { label: 'Archived', tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
};

const STATUS_OPTIONS: { value: BlogPostStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

// Shared token-based input styling (dark-safe, brand-blue focus ring).
const inputClass =
    'w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10';

const toolbarBtnClass =
    'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] font-semibold text-foreground transition-all hover:border-primary/40 hover:text-primary';

const StatusPill: React.FC<{ status: BlogPostStatus }> = ({ status }) => {
    const meta = STATUS_META[status] ?? STATUS_META.draft;
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', meta.tone)}>
            {meta.label}
        </span>
    );
};

const PreviewCard: React.FC<{ post: BlogFormState }> = ({ post }) => {
    const theme = getBlogCategoryTheme(post.category);
    const readingTime = estimateReadingTime(post.body || post.excerpt || post.title);
    const excerpt = post.excerpt.trim() || buildBlogExcerpt(post.body, post.title);

    return (
        <div className="overflow-hidden rounded-[28px] border border-border bg-card">
            <div className={`relative aspect-[16/10] bg-gradient-to-br ${theme.accent}`}>
                {post.coverImageUrl ? (
                    <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title || 'Blog cover'}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : null}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_36%),linear-gradient(180deg,rgba(11,17,31,0.06),rgba(11,17,31,0.72))]" />
                <div className="relative flex h-full flex-col justify-between p-5 text-white">
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${theme.badge}`}>
                        {post.category || 'Updates'}
                    </span>
                    <div className="space-y-3">
                        <h3 className="max-w-[18ch] font-serif text-[clamp(1.8rem,3vw,3.4rem)] leading-[0.94] tracking-[-0.05em]">
                            {post.title || 'Untitled story'}
                        </h3>
                        <p className="max-w-2xl text-[15px] leading-7 text-white/78">
                            {excerpt || 'Write a short summary that sells the post before the first paragraph.'}
                        </p>
                    </div>
                </div>
            </div>
            <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <Newspaper size={13} /> {post.authorName || 'MVPLAB Editorial'}
                    </span>
                    <span>{post.authorTitle || 'Editorial desk'}</span>
                    <span>{readingTime} min read</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                    <p className="text-[13px] font-medium text-muted-foreground">
                        {post.featured ? 'Featured on the public blog' : 'Standard post'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary">
                        Preview <ArrowRight size={15} />
                    </span>
                </div>
            </div>
        </div>
    );
};

export const AdminBlogPage: React.FC = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | BlogPostStatus>('all');
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [slugTouched, setSlugTouched] = useState(false);
    const [form, setForm] = useState<BlogFormState>(DEFAULT_FORM);
    const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    const loadPosts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchAdminBlogPosts();
            setPosts(data);
            if (!selectedPostId && data[0]) {
                selectPost(data[0]);
            }
        } catch (err) {
            setPosts([]);
            setError(err instanceof Error ? err.message : 'Failed to load blog posts.');
        } finally {
            setLoading(false);
        }
    };

    const selectPost = (post: BlogPost | null) => {
        if (!post) {
            setSelectedPostId(null);
            setForm(DEFAULT_FORM);
            setSlugTouched(false);
            return;
        }

        setSelectedPostId(post.id);
        setForm({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            body: post.body,
            category: post.category,
            status: post.status,
            featured: post.featured,
            authorName: post.authorName,
            authorTitle: post.authorTitle || '',
            coverImageUrl: post.coverImageUrl || '',
            coverImageAlt: post.coverImageAlt || '',
            tags: post.tags.join(', '),
            publishedAt: post.publishedAt || null,
        });
        setSlugTouched(true);
    };

    useEffect(() => {
        loadPosts();
    }, []);

    useEffect(() => {
        if (!slugTouched) {
            setForm((current) => ({
                ...current,
                slug: slugify(current.title),
            }));
        }
    }, [form.title, slugTouched]);

    const filteredPosts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return posts.filter((post) => {
            const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
            const matchesQuery = !query || [
                post.title,
                post.excerpt,
                post.category,
                post.authorName,
                post.tags.join(' '),
            ].some((value) => value.toLowerCase().includes(query));
            return matchesStatus && matchesQuery;
        });
    }, [posts, searchQuery, statusFilter]);

    const selectedPost = useMemo(
        () => posts.find((post) => post.id === selectedPostId) ?? null,
        [posts, selectedPostId],
    );

    const stats = useMemo(() => {
        const published = posts.filter((post) => post.status === 'published').length;
        const drafts = posts.filter((post) => post.status === 'draft').length;
        const featured = posts.filter((post) => post.featured).length;
        const categories = new Set(posts.map((post) => post.category)).size;
        return { published, drafts, featured, categories };
    }, [posts]);

    const clearFeedback = () => {
        setError(null);
        setSuccess(null);
    };

    const applyBodyEdit = (
        transform: (body: string, selectionStart: number, selectionEnd: number) => BodySelectionUpdate,
    ) => {
        const textarea = bodyTextareaRef.current;
        if (!textarea) return;

        const selectionStart = textarea.selectionStart ?? form.body.length;
        const selectionEnd = textarea.selectionEnd ?? form.body.length;
        let nextSelectionStart = selectionStart;
        let nextSelectionEnd = selectionEnd;

        setForm((current) => {
            const next = transform(current.body, selectionStart, selectionEnd);
            nextSelectionStart = next.selectionStart;
            nextSelectionEnd = next.selectionEnd;
            return { ...current, body: next.body };
        });

        window.requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);
        });
    };

    const wrapBodySelection = (prefix: string, suffix: string, placeholder: string) => {
        applyBodyEdit((body, selectionStart, selectionEnd) => {
            const selected = body.slice(selectionStart, selectionEnd);
            const content = selected || placeholder;
            const replacement = `${prefix}${content}${suffix}`;
            const nextBody = `${body.slice(0, selectionStart)}${replacement}${body.slice(selectionEnd)}`;

            return {
                body: nextBody,
                selectionStart: selectionStart + prefix.length,
                selectionEnd: selectionStart + prefix.length + content.length,
            };
        });
    };

    const insertBodyTemplate = (template: string, selectionStartOffset = template.length, selectionEndOffset = template.length) => {
        applyBodyEdit((body, selectionStart, selectionEnd) => {
            const nextBody = `${body.slice(0, selectionStart)}${template}${body.slice(selectionEnd)}`;

            return {
                body: nextBody,
                selectionStart: selectionStart + selectionStartOffset,
                selectionEnd: selectionStart + selectionEndOffset,
            };
        });
    };

    const insertBulletList = () => {
        insertBodyTemplate('- Item 1\n- Item 2\n\n', 2, 8);
    };

    const handleNewPost = () => {
        clearFeedback();
        selectPost(null);
    };

    const handleSelectPost = (post: BlogPost) => {
        clearFeedback();
        selectPost(post);
    };

    const confirmDelete = async () => {
        if (!selectedPost) return;

        try {
            setDeleting(true);
            clearFeedback();
            await deleteBlogPost(selectedPost.id);
            setSuccess('Blog post deleted.');
            await loadPosts();
            selectPost(null);
            setConfirmDeleteOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete post.');
            setConfirmDeleteOpen(false);
        } finally {
            setDeleting(false);
        }
    };

    const submitPost = async (nextStatus?: BlogPostStatus) => {
        const title = form.title.trim();
        const slug = slugify(form.slug || form.title);
        const body = form.body.trim();
        const category = form.category.trim() || 'Updates';
        const excerpt = form.excerpt.trim() || buildBlogExcerpt(body, title);
        const authorName = form.authorName.trim() || 'MVPLab Editorial';
        const tags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
        const status = nextStatus || form.status;
        // When transitioning to published without an explicit publish date, stamp
        // it so formatBlogDate() renders and published_at ordering works. Never
        // overwrite an existing publish date.
        const publishedAt =
            status === 'published' && !form.publishedAt
                ? new Date().toISOString()
                : form.publishedAt;

        if (!title || !body || !category || !excerpt) {
            setError('Title, category, body, and excerpt are required.');
            return;
        }

        const payload: BlogPostInput = {
            title,
            slug,
            excerpt,
            body,
            category,
            status,
            featured: form.featured,
            authorName,
            authorTitle: form.authorTitle.trim() || undefined,
            coverImageUrl: form.coverImageUrl.trim() || undefined,
            coverImageAlt: form.coverImageAlt.trim() || undefined,
            tags,
            publishedAt,
            readingTimeMinutes: estimateReadingTime(body),
        };

        try {
            setSaving(true);
            clearFeedback();
            const saved = selectedPost ? await updateBlogPost(selectedPost.id, payload) : await createBlogPost(payload);
            setSuccess(selectedPost ? 'Blog post updated.' : 'Blog post created.');
            await loadPosts();
            selectPost(saved);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save blog post.');
        } finally {
            setSaving(false);
        }
    };

    const activePostCount = filteredPosts.length;
    const readingMinutes = estimateReadingTime(form.body || form.excerpt || form.title);

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-[1440px] space-y-8 pb-20">
                <section className="rounded-[32px] border border-border bg-card p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                                <Newspaper size={14} /> Admin Blog
                            </div>
                            <h1 className="text-[clamp(2.4rem,4vw,4rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-foreground">
                                Publish product notes and updates from one place.
                            </h1>
                            <p className="max-w-3xl text-[15px] leading-7 text-muted-foreground">
                                Draft, publish, and update public stories without leaving the dashboard. Published posts appear on the public blog at{' '}
                                <Link to="/blog" className="font-semibold text-primary hover:underline">
                                    /blog
                                </Link>
                                .
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/blog"
                                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-[14px] font-semibold text-foreground transition-all hover:border-primary/40 hover:text-primary"
                            >
                                <ExternalLink size={15} /> View live blog
                            </Link>
                            <Button variant="outline" onClick={handleNewPost} className="rounded-full px-4 py-3">
                                <Plus size={15} /> New post
                            </Button>
                            <Button variant="default" onClick={loadPosts} className="rounded-full px-4 py-3">
                                <RefreshCw size={15} /> Refresh
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile label="Published" value={stats.published} icon={CheckCircle2} />
                    <StatTile label="Drafts" value={stats.drafts} icon={Loader2} />
                    <StatTile label="Featured" value={stats.featured} icon={Sparkles} />
                    <StatTile label="Categories" value={stats.categories} icon={Layers} />
                </section>

                {success ? (
                    <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 p-4 text-[14px] font-medium text-emerald-700 dark:text-emerald-300">
                        {success}
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-[20px] border border-error/20 bg-error/10 p-4 text-error">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                            <p className="text-[14px] leading-6">{error}</p>
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="space-y-6">
                        <div className="rounded-[32px] border border-border bg-card p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Editor</p>
                                    <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-foreground">
                                        {selectedPost ? `Editing: ${selectedPost.title}` : 'Create a new story'}
                                    </h2>
                                </div>
                                {selectedPost ? <StatusPill status={selectedPost.status} /> : null}
                            </div>

                            {loading ? (
                                <div className="mt-8 flex items-center gap-3 rounded-[22px] border border-dashed border-border bg-muted p-6 text-muted-foreground">
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Loading blog posts...</span>
                                </div>
                            ) : (
                                <div className="mt-8 space-y-5">
                                    <FormField label="Title">
                                        {(field) => (
                                            <input
                                                {...field}
                                                value={form.title}
                                                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                                className={inputClass}
                                                placeholder="Why we rebuilt the homepage"
                                            />
                                        )}
                                    </FormField>

                                    <div className="grid gap-5 md:grid-cols-2">
                                        <FormField label="Slug" helperText="Leave it auto-generated or edit it for SEO.">
                                            {(field) => (
                                                <input
                                                    {...field}
                                                    value={form.slug}
                                                    onChange={(event) => {
                                                        setSlugTouched(true);
                                                        setForm((current) => ({ ...current, slug: event.target.value }));
                                                    }}
                                                    onBlur={() => setSlugTouched(true)}
                                                    className={inputClass}
                                                    placeholder="why-we-rebuilt-the-homepage"
                                                />
                                            )}
                                        </FormField>

                                        <FormField label="Category">
                                            {(field) => (
                                                <input
                                                    {...field}
                                                    value={form.category}
                                                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                                                    className={inputClass}
                                                    placeholder="Product"
                                                />
                                            )}
                                        </FormField>
                                    </div>

                                    <div className="grid gap-5 md:grid-cols-2">
                                        <FormField label="Author name">
                                            {(field) => (
                                                <input
                                                    {...field}
                                                    value={form.authorName}
                                                    onChange={(event) => setForm((current) => ({ ...current, authorName: event.target.value }))}
                                                    className={inputClass}
                                                    placeholder="MVPLAB Editorial"
                                                />
                                            )}
                                        </FormField>

                                        <FormField label="Author title">
                                            {(field) => (
                                                <input
                                                    {...field}
                                                    value={form.authorTitle}
                                                    onChange={(event) => setForm((current) => ({ ...current, authorTitle: event.target.value }))}
                                                    className={inputClass}
                                                    placeholder="Product desk"
                                                />
                                            )}
                                        </FormField>
                                    </div>

                                    <FormField
                                        label="Status"
                                        helperText="Scheduled and archived posts stay in the admin list. Only published posts appear on the public blog."
                                    >
                                        {(field) => (
                                            <select
                                                {...field}
                                                value={form.status}
                                                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BlogPostStatus }))}
                                                className={inputClass}
                                            >
                                                {STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </FormField>

                                    <div className="grid gap-5 md:grid-cols-2">
                                        <FormField label="Cover image URL" helperText="Optional. Leave blank for the editorial gradient cover.">
                                            {(field) => (
                                                <input
                                                    {...field}
                                                    value={form.coverImageUrl}
                                                    onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                                                    className={inputClass}
                                                    placeholder="https://..."
                                                />
                                            )}
                                        </FormField>

                                        <FormField label="Cover image alt">
                                            {(field) => (
                                                <input
                                                    {...field}
                                                    value={form.coverImageAlt}
                                                    onChange={(event) => setForm((current) => ({ ...current, coverImageAlt: event.target.value }))}
                                                    className={inputClass}
                                                    placeholder="Homepage preview for the marketplace"
                                                />
                                            )}
                                        </FormField>
                                    </div>

                                    <FormField
                                        label="Excerpt"
                                        helperText="If left empty, the editor will derive a short excerpt from the body."
                                    >
                                        {(field) => (
                                            <textarea
                                                {...field}
                                                value={form.excerpt}
                                                onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
                                                rows={4}
                                                className={cn(inputClass, 'rounded-[20px]')}
                                                placeholder="A short summary that makes the story worth opening."
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        label="Body"
                                        helperText="Use short headings, bullet lists, and direct paragraphs. The public reader renders simple markdown-style structure."
                                    >
                                        {(field) => (
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap gap-2 rounded-[18px] border border-border bg-muted p-3">
                                                    <button type="button" onClick={() => wrapBodySelection('## ', '\n\n', 'Heading 2')} className={toolbarBtnClass}>
                                                        <Heading2 size={14} /> H2
                                                    </button>
                                                    <button type="button" onClick={() => wrapBodySelection('### ', '\n\n', 'Heading 3')} className={toolbarBtnClass}>
                                                        <Heading3 size={14} /> H3
                                                    </button>
                                                    <button type="button" onClick={insertBulletList} className={toolbarBtnClass}>
                                                        <List size={14} /> List
                                                    </button>
                                                    <button type="button" onClick={() => wrapBodySelection('> ', '\n\n', 'Quote text')} className={toolbarBtnClass}>
                                                        <Quote size={14} /> Quote
                                                    </button>
                                                    <button type="button" onClick={() => insertBodyTemplate('\n---\n\n')} className={toolbarBtnClass}>
                                                        <Minus size={14} /> Divider
                                                    </button>
                                                    <button type="button" onClick={() => wrapBodySelection('**', '**', 'bold text')} className={toolbarBtnClass}>
                                                        <Bold size={14} /> Bold
                                                    </button>
                                                    <button type="button" onClick={() => wrapBodySelection('*', '*', 'italic text')} className={toolbarBtnClass}>
                                                        <Italic size={14} /> Italic
                                                    </button>
                                                    <button type="button" onClick={() => wrapBodySelection('[', '](https://example.com)', 'link text')} className={toolbarBtnClass}>
                                                        <Link2 size={14} /> Link
                                                    </button>
                                                </div>
                                                <textarea
                                                    {...field}
                                                    ref={bodyTextareaRef}
                                                    value={form.body}
                                                    onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                                                    rows={16}
                                                    className={cn(inputClass, 'rounded-[20px] font-mono text-[14px] leading-7')}
                                                    placeholder={`## What changed\n\nExplain the update in short, specific sections.\n\n- What changed\n- Why it matters\n- What readers should do next`}
                                                />
                                            </div>
                                        )}
                                    </FormField>

                                    <div className="grid gap-5 md:grid-cols-2">
                                        <FormField label="Tags" helperText="Comma-separated tags such as product, launch, growth.">
                                            {(field) => (
                                                <input
                                                    {...field}
                                                    value={form.tags}
                                                    onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                                                    className={inputClass}
                                                    placeholder="product, launch, updates"
                                                />
                                            )}
                                        </FormField>

                                        <FormField label="Reading time" helperText={`${readingMinutes} minutes estimated automatically`}>
                                            <div className="flex h-[52px] items-center rounded-xl border border-border bg-muted px-4 text-[15px] font-semibold text-muted-foreground">
                                                {readingMinutes} min
                                            </div>
                                        </FormField>
                                    </div>

                                    <label className="flex items-center gap-3 rounded-[18px] border border-border bg-muted px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={form.featured}
                                            onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
                                        />
                                        <span>
                                            <span className="block text-[14px] font-semibold text-foreground">Feature this post</span>
                                            <span className="block text-[12px] leading-5 text-muted-foreground">Featured posts lead the public blog page.</span>
                                        </span>
                                    </label>

                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => submitPost('draft')}
                                            disabled={saving || deleting}
                                            className="rounded-full px-4 py-3"
                                        >
                                            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                                            Save draft
                                        </Button>
                                        <Button
                                            variant="default"
                                            onClick={() => submitPost('published')}
                                            disabled={saving || deleting}
                                            className="rounded-full px-4 py-3"
                                        >
                                            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                                            Publish
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => submitPost()}
                                            disabled={saving || deleting}
                                            className="rounded-full px-4 py-3"
                                        >
                                            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                                            {selectedPost ? 'Update post' : 'Create post'}
                                        </Button>
                                        {selectedPost ? (
                                            <Button
                                                variant="destructive"
                                                onClick={() => setConfirmDeleteOpen(true)}
                                                disabled={saving || deleting}
                                                className="rounded-full px-4 py-3"
                                            >
                                                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                Delete
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <div className="rounded-[32px] border border-border bg-card p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Library</p>
                                    <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-foreground">
                                        Saved posts
                                    </h2>
                                </div>
                                <p className="text-[13px] text-muted-foreground">{activePostCount} results</p>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <input
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder="Search title, tags, or category"
                                        className={cn(inputClass, 'px-11 py-3 text-[14px]')}
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(['all', 'draft', 'scheduled', 'published', 'archived'] as const).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className={cn(
                                                'rounded-full border px-3 py-2 text-[12px] font-semibold capitalize transition-all',
                                                statusFilter === status
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-primary',
                                            )}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>

                                {loading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 3 }).map((_, index) => (
                                            <div key={index} className="rounded-[22px] border border-dashed border-border bg-muted p-4">
                                                <div className="h-4 w-24 animate-pulse rounded-full bg-border" />
                                                <div className="mt-3 h-5 w-4/5 animate-pulse rounded-full bg-border" />
                                                <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-border" />
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredPosts.length === 0 ? (
                                    <EmptyState
                                        icon={Newspaper}
                                        size="sm"
                                        title="No posts match this filter."
                                        description="Adjust your search or status filter, or start a new story."
                                        action={{ label: 'New post', onClick: handleNewPost, icon: Plus }}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {filteredPosts.map((post) => {
                                            const isSelected = post.id === selectedPostId;
                                            return (
                                                <button
                                                    key={post.id}
                                                    onClick={() => handleSelectPost(post)}
                                                    className={cn(
                                                        'w-full rounded-[22px] border p-4 text-left transition-all',
                                                        isSelected
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted',
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <StatusPill status={post.status} />
                                                                {post.featured ? (
                                                                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                                                                        Featured
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <h3 className="mt-3 line-clamp-2 text-[16px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
                                                                {post.title}
                                                            </h3>
                                                        </div>
                                                        <span className="text-[11px] font-medium text-muted-foreground">{post.readingTimeMinutes}m</span>
                                                    </div>
                                                    <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-muted-foreground">
                                                        {post.excerpt}
                                                    </p>
                                                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                                                        <span>{post.category}</span>
                                                        <span>{formatBlogDate(post.publishedAt)}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <PreviewCard post={form} />
                    </aside>
                </div>
            </div>

            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                tone="danger"
                title="Delete this post?"
                description={
                    selectedPost
                        ? `"${selectedPost.title}" will be permanently removed from the blog. This cannot be undone.`
                        : 'This post will be permanently removed. This cannot be undone.'
                }
                confirmLabel="Delete post"
                loading={deleting}
                onConfirm={confirmDelete}
            />
        </DashboardLayout>
    );
};
