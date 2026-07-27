export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    category: string;
    status: BlogPostStatus;
    featured: boolean;
    authorName: string;
    authorTitle?: string | null;
    coverImageUrl?: string | null;
    coverImageAlt?: string | null;
    tags: string[];
    readingTimeMinutes: number;
    publishedAt?: string | null;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BlogPostInput {
    title: string;
    slug?: string;
    excerpt: string;
    body: string;
    category: string;
    status?: BlogPostStatus;
    featured?: boolean;
    authorName?: string;
    authorTitle?: string;
    coverImageUrl?: string;
    coverImageAlt?: string;
    tags?: string[];
    readingTimeMinutes?: number;
    publishedAt?: string | null;
}

export type BlogContentBlock =
    | { type: 'heading'; level: 2 | 3; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list'; items: string[] }
    | { type: 'quote'; text: string }
    | { type: 'divider' };
