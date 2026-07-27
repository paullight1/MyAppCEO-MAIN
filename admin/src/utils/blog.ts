import type { BlogContentBlock } from '../types/blog';

export const BLOG_CATEGORY_THEMES: Record<string, { badge: string; panel: string; accent: string }> = {
    Product: {
        badge: 'bg-[#e8f1ff] text-[#0f4ea8]',
        panel: 'bg-[#f5f8ff]',
        accent: 'from-[#0b1220] via-[#13213a] to-[#1d4ed8]',
    },
    Launch: {
        badge: 'bg-[#ecf8f1] text-[#166534]',
        panel: 'bg-[#f3fbf6]',
        accent: 'from-[#0b1220] via-[#10241b] to-[#15803d]',
    },
    Company: {
        badge: 'bg-[#f2f4f8] text-[#334155]',
        panel: 'bg-[#f7f9fb]',
        accent: 'from-[#0b1220] via-[#1e293b] to-[#334155]',
    },
    Guides: {
        badge: 'bg-[#fff5e8] text-[#9a5b00]',
        panel: 'bg-[#fffaf2]',
        accent: 'from-[#1b1208] via-[#3b2a14] to-[#c06f00]',
    },
    Operations: {
        badge: 'bg-[#eef4ff] text-[#1d4ed8]',
        panel: 'bg-[#f7f9ff]',
        accent: 'from-[#0b1220] via-[#172554] to-[#2563eb]',
    },
    Updates: {
        badge: 'bg-[#edf7ff] text-[#0958b0]',
        panel: 'bg-[#f6fbff]',
        accent: 'from-[#0b1220] via-[#0f2a4d] to-[#0ea5e9]',
    },
    Default: {
        badge: 'bg-[#edf2f7] text-[#334155]',
        panel: 'bg-[#f8fafc]',
        accent: 'from-[#0b1220] via-[#1f2937] to-[#64748b]',
    },
};

export const BLOG_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;

export const slugify = (value: string): string => {
    return value
        .toLowerCase()
        .trim()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 96) || 'blog-post';
};

const safeDecodeURIComponent = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

export const formatBlogDate = (value?: string | null): string => {
    if (!value) return 'Unpublished';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unpublished';
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
};

export const estimateReadingTime = (body: string): number => {
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180) || 1);
};

export const normalizeTags = (tags: unknown): string[] => {
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    if (typeof tags === 'string') {
        return tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
    }
    return [];
};

export const getBlogCategoryTheme = (category?: string | null) => {
    if (!category) return BLOG_CATEGORY_THEMES.Default;
    const normalized = category.trim().toLowerCase();
    const key = Object.keys(BLOG_CATEGORY_THEMES).find(
        (candidate) => candidate.toLowerCase() === normalized,
    );
    return key ? BLOG_CATEGORY_THEMES[key] : BLOG_CATEGORY_THEMES.Default;
};

export const buildBlogCategoryPath = (category: string): string => `/blog/category/${encodeURIComponent(slugify(category))}`;

export const formatBlogCategoryLabel = (value?: string | null): string => {
    if (!value) return 'All';

    const normalized = safeDecodeURIComponent(value)
        .replace(/[-_]+/g, ' ')
        .trim();

    if (!normalized) return 'All';

    return normalized
        .split(/\s+/)
        .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
        .join(' ');
};

export const parseBlogBody = (body: string): BlogContentBlock[] => {
    const blocks: BlogContentBlock[] = [];
    const lines = body.split(/\r?\n/);
    let paragraph: string[] = [];
    let quote: string[] = [];
    let list: string[] = [];

    const flushParagraph = () => {
        const text = paragraph.join(' ').trim();
        if (text) blocks.push({ type: 'paragraph', text });
        paragraph = [];
    };

    const flushQuote = () => {
        const text = quote.join(' ').trim();
        if (text) blocks.push({ type: 'quote', text });
        quote = [];
    };

    const flushList = () => {
        if (list.length) blocks.push({ type: 'list', items: [...list] });
        list = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            flushParagraph();
            flushQuote();
            flushList();
            continue;
        }

        if (line === '---') {
            flushParagraph();
            flushQuote();
            flushList();
            blocks.push({ type: 'divider' });
            continue;
        }

        if (line.startsWith('### ')) {
            flushParagraph();
            flushQuote();
            flushList();
            blocks.push({ type: 'heading', level: 3, text: line.slice(4).trim() });
            continue;
        }

        if (line.startsWith('## ')) {
            flushParagraph();
            flushQuote();
            flushList();
            blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() });
            continue;
        }

        if (line.startsWith('> ')) {
            flushParagraph();
            flushList();
            quote.push(line.slice(2).trim());
            continue;
        }

        if (/^[-*]\s+/.test(line)) {
            flushParagraph();
            flushQuote();
            list.push(line.replace(/^[-*]\s+/, '').trim());
            continue;
        }

        flushQuote();
        flushList();
        paragraph.push(line);
    }

    flushParagraph();
    flushQuote();
    flushList();

    return blocks;
};
