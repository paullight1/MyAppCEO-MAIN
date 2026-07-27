import { supabase } from './supabaseClient';
import type { BlogPost, BlogPostInput, BlogPostStatus } from '../types/blog';
import { estimateReadingTime, normalizeTags, slugify } from '../utils/blog';

const BLOG_TABLE = 'blog_posts';

const isMissingTableError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('blog_posts') && (
        message.includes('does not exist') ||
        message.includes('relation') ||
        message.includes('404')
    );
};

const formatBlogError = (error: unknown, fallback: string): Error => {
    if (isMissingTableError(error)) {
        return new Error('Blog database is not configured yet. Apply the blog migration.');
    }
    if (error instanceof Error) {
        return new Error(error.message || fallback);
    }
    return new Error(fallback);
};

const asString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (value == null) return fallback;
    return String(value);
};

const asNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const asBoolean = (value: unknown): boolean => value === true || value === 'true' || value === 1;

const rowToBlogPost = (row: Record<string, unknown>): BlogPost => ({
    id: asString(row.id),
    slug: asString(row.slug),
    title: asString(row.title),
    excerpt: asString(row.excerpt),
    body: asString(row.body),
    category: asString(row.category, 'Updates'),
    status: (asString(row.status, 'draft') as BlogPostStatus),
    featured: asBoolean(row.featured),
    authorName: asString(row.author_name, 'MVPLAB Editorial'),
    authorTitle: row.author_title == null ? null : asString(row.author_title),
    coverImageUrl: row.cover_image_url == null ? null : asString(row.cover_image_url),
    coverImageAlt: row.cover_image_alt == null ? null : asString(row.cover_image_alt),
    tags: normalizeTags(row.tags),
    readingTimeMinutes: Math.max(1, asNumber(row.reading_time_minutes, estimateReadingTime(asString(row.body)))),
    publishedAt: row.published_at == null ? null : asString(row.published_at),
    createdBy: row.created_by == null ? null : asString(row.created_by),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
});

const toSnakePayload = (input: BlogPostInput, slug: string, authorId?: string) => ({
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    body: input.body.trim(),
    category: input.category.trim() || 'Updates',
    status: input.status ?? 'draft',
    featured: Boolean(input.featured),
    author_name: input.authorName?.trim() || 'MVPLAB Editorial',
    author_title: input.authorTitle?.trim() || null,
    cover_image_url: input.coverImageUrl?.trim() || null,
    cover_image_alt: input.coverImageAlt?.trim() || null,
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => tag.trim()).filter(Boolean) : [],
    reading_time_minutes: Math.max(1, input.readingTimeMinutes ?? estimateReadingTime(input.body)),
    published_at: input.publishedAt ?? (input.status === 'published' ? new Date().toISOString() : null),
    ...(authorId ? { created_by: authorId } : {}),
});

const isDuplicateSlugError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('duplicate key value violates unique constraint') || message.includes('blog_posts_slug_key');
};

export const getBlogCategoryFallback = (category?: string | null): string => category?.trim() || 'Updates';

export const fetchPublishedBlogPosts = async (): Promise<BlogPost[]> => {
    const { data, error } = await supabase
        .from(BLOG_TABLE)
        .select('*')
        .eq('status', 'published')
        .order('featured', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

    if (error) throw formatBlogError(error, 'Failed to load blog posts.');
    return (data || []).map((row) => rowToBlogPost(row as Record<string, unknown>));
};

export const fetchAdminBlogPosts = async (): Promise<BlogPost[]> => {
    const { data, error } = await supabase
        .from(BLOG_TABLE)
        .select('*')
        .order('featured', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });

    if (error) throw formatBlogError(error, 'Failed to load blog posts.');
    return (data || []).map((row) => rowToBlogPost(row as Record<string, unknown>));
};

export const fetchBlogPostBySlug = async (slug: string, includeDrafts = false): Promise<BlogPost | null> => {
    let query = supabase.from(BLOG_TABLE).select('*').eq('slug', slug).limit(1);

    if (!includeDrafts) {
        query = query.eq('status', 'published');
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw formatBlogError(error, 'Failed to load blog post.');
    if (!data) return null;
    return rowToBlogPost(data as Record<string, unknown>);
};

export const createBlogPost = async (input: BlogPostInput): Promise<BlogPost> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw formatBlogError(authError, 'You must be signed in to create blog posts.');
    const userId = authData.user?.id;
    if (!userId) throw new Error('You must be signed in to create blog posts.');

    const baseSlug = slugify(input.slug || input.title);
    const candidates = input.slug ? [baseSlug] : [baseSlug, `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`];
    let lastError: unknown = null;

    for (const slug of candidates) {
        const payload = toSnakePayload(input, slug, userId);
        const { data, error } = await supabase.from(BLOG_TABLE).insert(payload).select('*').single();
        if (!error && data) {
            return rowToBlogPost(data as Record<string, unknown>);
        }

        if (error && !input.slug && isDuplicateSlugError(error)) {
            lastError = error;
            continue;
        }

        throw formatBlogError(error, 'Failed to create blog post.');
    }

    throw formatBlogError(lastError, 'Failed to create blog post.');
};

export const updateBlogPost = async (id: string, input: BlogPostInput): Promise<BlogPost> => {
    const payload = toSnakePayload(input, slugify(input.slug || input.title));
    const { data, error } = await supabase
        .from(BLOG_TABLE)
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw formatBlogError(error, 'Failed to update blog post.');
    if (!data) throw new Error('Blog post not found.');
    return rowToBlogPost(data as Record<string, unknown>);
};

export const deleteBlogPost = async (id: string): Promise<void> => {
    const { error } = await supabase.from(BLOG_TABLE).delete().eq('id', id);
    if (error) throw formatBlogError(error, 'Failed to delete blog post.');
};

export const buildBlogExcerpt = (body: string, fallback = ''): string => {
    const firstBlock = body
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('>'));

    return firstBlock || fallback || '';
};
