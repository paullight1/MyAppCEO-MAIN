import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button, Card, EmptyState, FormField } from '../components/ui';
import { cn } from '../utils/cn';
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    CircleDollarSign,
    Code2,
    ExternalLink,
    GitBranch,
    HelpCircle,
    Lightbulb,
    Rocket,
    Scale,
    Search,
    ShieldCheck,
    Store,
    WalletCards,
} from 'lucide-react';

type DocSection = {
    title: string;
    body: string;
    bullets?: string[];
};

type DocArticle = {
    slug: string;
    title: string;
    category: string;
    summary: string;
    icon: React.ElementType;
    readTime: string;
    page: string;
    docsPath?: string;
    audience: string;
    checklist: string[];
    sections: DocSection[];
};

const DOCS_URL = import.meta.env.VITE_DOCS_URL || '/documentation';

const docsHref = (path: string): string => {
    const normalizedBase = DOCS_URL.endsWith('/') ? DOCS_URL.slice(0, -1) : DOCS_URL;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
};

const isExternalHref = (href: string): boolean => /^https?:\/\//i.test(href);

const DOC_ARTICLES: DocArticle[] = [
    {
        slug: 'overview',
        title: 'Platform Overview',
        category: 'Start here',
        summary: 'How MyAppCEO connects app ideas, listings, compliance, funding, and operations.',
        icon: BookOpen,
        readTime: '3 min',
        page: '/dashboard',
        docsPath: '/',
        audience: 'All users',
        checklist: ['Create or import an app', 'Complete profile verification', 'Add legal context', 'Track listing, campaign, and finance activity'],
        sections: [
            {
                title: 'What MyAppCEO is for',
                body: 'MyAppCEO is a workspace for people who build, sell, buy, fund, or operate mobile app businesses. The dashboard keeps ideas, owned apps, marketplace listings, legal readiness, and growth tools in one place.',
            },
            {
                title: 'Core workflow',
                body: 'Most users start with an idea or an existing app. From there, they can prepare a listing, invite partners, check license requirements, start a campaign, or connect external services.',
                bullets: ['Use Ideas for app concepts and product context.', 'Use My Apps for owned or imported apps.', 'Use Marketplace and Analytics when preparing sales or research.', 'Use Legal before launching regulated products.'],
            },
        ],
    },
    {
        slug: 'new-idea',
        title: 'Create a New App Idea',
        category: 'Build',
        summary: 'Capture the product context needed to turn a concept into a structured app project.',
        icon: Lightbulb,
        readTime: '4 min',
        page: '/ideas/new',
        audience: 'Founders',
        checklist: ['Clear app name', 'Problem and target user', 'Category and platform', 'Core features', 'Review before submit'],
        sections: [
            {
                title: 'What to include',
                body: 'Describe the app in operational terms: the user, the problem, the first useful outcome, and the feature set needed for a credible first version.',
            },
            {
                title: 'Feature planning',
                body: 'Separate the features that define the product from later improvements. This keeps generated PRDs, design tasks, and development estimates easier to review.',
                bullets: ['Must-have: required for the app to work.', 'Should-have: improves trust, retention, or monetization.', 'Later: useful but not needed for launch.'],
            },
        ],
    },
    {
        slug: 'listing',
        title: 'List an App for Sale',
        category: 'Marketplace',
        summary: 'Prepare a listing with store details, proof, pricing, and transfer context.',
        icon: Store,
        readTime: '6 min',
        page: '/listings/new',
        docsPath: '/guides/create-listing',
        audience: 'Sellers',
        checklist: ['Store URL or package ID', 'App icon and screenshots', 'Revenue or usage proof', 'Technical stack', 'Transfer assets'],
        sections: [
            {
                title: 'Listing quality',
                body: 'Buyers need enough context to judge the asset quickly. A strong listing explains what the app does, who uses it, how it earns, and what exactly transfers after purchase.',
            },
            {
                title: 'Store import',
                body: 'When the app is already live, import public Play Store or App Store details first. Then fill the parts that public stores cannot explain, such as revenue proof, code ownership, support terms, and operational risks.',
            },
        ],
    },
    {
        slug: 'campaigns',
        title: 'Campaigns and Co-ownership',
        category: 'Investment',
        summary: 'Create funding context for apps that need partners, capital, or shared ownership.',
        icon: CircleDollarSign,
        readTime: '5 min',
        page: '/campaigns',
        docsPath: '/guides/launch-campaign',
        audience: 'Founders and investors',
        checklist: ['Funding target', 'Use of funds', 'Milestones', 'Ownership terms', 'Risk notes'],
        sections: [
            {
                title: 'When to use a campaign',
                body: 'Use campaigns when an app needs funding, distribution help, technical execution, or co-owners. Keep the campaign tied to a specific app or idea so investors can review the asset behind the raise.',
            },
            {
                title: 'Milestone context',
                body: 'Good milestones are observable. Replace vague goals with outcomes such as beta release, payment integration, app store submission, onboarding conversion, or first paid users.',
            },
        ],
    },
    {
        slug: 'legal',
        title: 'Legal and Licenses',
        category: 'Compliance',
        summary: 'Find Nigerian license and registration paths that may apply to mobile app products.',
        icon: Scale,
        readTime: '7 min',
        page: '/legal',
        audience: 'Operators',
        checklist: ['CAC registration', 'Tax setup', 'NDPR readiness', 'Regulator-specific license', 'Required documents'],
        sections: [
            {
                title: 'Start with product risk',
                body: 'A simple content or utility app has different requirements from a payment, lending, insurance, telecom, health, or investment product. Use the legal page to match the app model to the regulator.',
            },
            {
                title: 'Application forms',
                body: "Each license card now points to the regulator's official application page when a form is missing, while the in-app fields and checklist stay aligned to the documents normally requested. Treat the workspace view as a readiness checklist before filing externally.",
            },
        ],
    },
    {
        slug: 'connections',
        title: 'Connections',
        category: 'Operations',
        summary: 'Connect store, analytics, marketing, and operational services without exposing unnecessary keys.',
        icon: GitBranch,
        readTime: '4 min',
        page: '/connections',
        audience: 'Operators',
        checklist: ['Choose service type', 'Connect from app context when possible', 'Review permissions', 'Confirm account owner', 'Reconnect failed services'],
        sections: [
            {
                title: 'App-scoped connections',
                body: 'Services like social accounts, app store integrations, analytics, and promotion tools should be tied to the app they support when possible. This keeps the dashboard cleaner and avoids global connections with unclear ownership.',
            },
            {
                title: 'API key handling',
                body: 'The UI should not display raw API keys unless developer access is explicitly needed. Most users only need connection status, account name, last sync, and the workflow that uses the service.',
            },
        ],
    },
    {
        slug: 'finance',
        title: 'Finance and Payouts',
        category: 'Finance',
        summary: 'Understand revenue, payout, ownership, and portfolio movement across app assets.',
        icon: WalletCards,
        readTime: '5 min',
        page: '/finances',
        audience: 'Finance teams',
        checklist: ['Verify revenue sources', 'Review payout status', 'Track fees', 'Reconcile campaign activity', 'Export records'],
        sections: [
            {
                title: 'What to track',
                body: 'Finance panels should help users understand revenue proof, pending balances, completed payouts, fees, and investment exposure. This context supports valuation, campaign review, and buyer diligence.',
            },
            {
                title: 'When data is missing',
                body: 'Some finance panels depend on backend services. If a service is offline or blocked, show an empty or unavailable state instead of implying a zero balance.',
            },
        ],
    },
    {
        slug: 'developer-api',
        title: 'Developer API Access',
        category: 'API',
        summary: 'Create scoped API keys, connect backend systems, and subscribe to marketplace events.',
        icon: Code2,
        readTime: '6 min',
        page: '/developers',
        docsPath: '/api-reference/introduction',
        audience: 'Developers',
        checklist: ['Create separate test and live keys', 'Copy display-once secrets immediately', 'Use least-privilege scopes', 'Rotate keys on release', 'Subscribe only to required webhook events'],
        sections: [
            {
                title: 'Production key handling',
                body: 'Developer access should be scoped, audited, and revocable. The portal is responsible for display-once secret UX; backend storage should retain only hashed secrets and key metadata.',
            },
            {
                title: 'API surface',
                body: 'The first supported API references cover listings, campaigns, escrow, and webhooks. Use test keys for staging and keep live keys out of frontend bundles.',
                bullets: ['Listings APIs support marketplace listing workflows.', 'Campaign APIs support funding and investment workflows.', 'Escrow APIs support deal and release state.', 'Webhook events keep external systems synchronized.'],
            },
        ],
    },
    {
        slug: 'release-readiness',
        title: 'Release Readiness',
        category: 'Operations',
        summary: 'Final gates for staging sign-off, rollback, incident contacts, and workstream acceptance.',
        icon: Rocket,
        readTime: '8 min',
        page: '/documentation',
        docsPath: '/release-readiness',
        audience: 'Operators and release owners',
        checklist: ['Typecheck, lint, tests, and build pass', 'Migration verification completed', 'Environment variables validated', 'Smoke test signed off', 'Rollback owner assigned'],
        sections: [
            {
                title: 'Release gates',
                body: 'A production release should fail closed when required providers, migrations, secrets, or smoke checks are missing. Track this by workstream so teams can finish independently without editing each other\'s files.',
            },
            {
                title: 'Operational ownership',
                body: 'Keep release owners, incident contacts, rollback steps, and feature flag decisions visible before deployment. Link gaps to the owning workstream instead of hiding them as generic launch risk.',
            },
        ],
    },
];

const QUICK_LINKS = [
    { label: 'Create idea', href: '/ideas/new', icon: Lightbulb },
    { label: 'Legal setup', href: '/legal', icon: Scale },
    { label: 'List app', href: '/listings/new', icon: Store },
    { label: 'Developer portal', href: '/developers', icon: Code2 },
    { label: 'Support', href: '/support', icon: HelpCircle },
];

const API_REFERENCES = [
    { label: 'Listings API', href: docsHref('/api-reference/listings/create'), body: 'Create, update, and list marketplace assets.' },
    { label: 'Campaigns API', href: docsHref('/api-reference/campaigns/create'), body: 'Create campaigns and support investment workflows.' },
    { label: 'Escrow API', href: docsHref('/api-reference/escrow/create'), body: 'Create escrow deals and release milestones.' },
    { label: 'External API overview', href: docsHref('/api-reference/introduction'), body: 'Authentication, pagination, rate limits, and webhooks.' },
];

const DOCS_SOURCE_LINKS = [
    { label: 'Configured docs URL', href: DOCS_URL, body: 'Set VITE_DOCS_URL per environment for hosted docs.' },
    { label: 'Mintlify source', href: '/documentation', body: 'In-app index reflects docs-mintlify concepts, guides, and API groups.' },
    { label: 'Release checklist', href: docsHref('/release-readiness'), body: 'Release gates and staging sign-off, mirrored from docs/release-readiness.' },
];

const CONTEXT_NOTES = [
    { title: 'Protected areas', body: 'Dashboard workflows require sign-in and should use the active user session.' },
    { title: 'Public data', body: 'Store imports can prefill public app metadata, but ownership and finance proof still need user input.' },
    { title: 'Compliance first', body: 'Regulated app categories should be checked before launch, listing, or fundraising.' },
];

const ResourceLink: React.FC<{ href: string; label: string; body: string; forceExternal?: boolean }> = ({
    href,
    label,
    body,
    forceExternal,
}) => {
    const external = forceExternal ?? isExternalHref(href);
    const className = 'block rounded-xl bg-muted p-3 transition hover:bg-muted/70';
    const Trailing = external ? ExternalLink : ArrowRight;
    const content = (
        <>
            <span className="flex items-center justify-between gap-3 text-sm font-bold text-foreground">
                {label}
                <Trailing size={14} className="shrink-0 text-primary" />
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{body}</span>
        </>
    );

    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                {content}
            </a>
        );
    }

    return (
        <Link to={href} className={className}>
            {content}
        </Link>
    );
};

export const DocumentationCenterPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [selectedSlug, setSelectedSlug] = useState(DOC_ARTICLES[0].slug);

    const filteredArticles = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return DOC_ARTICLES;

        return DOC_ARTICLES.filter((article) =>
            [article.title, article.category, article.summary, article.audience, article.page]
                .join(' ')
                .toLowerCase()
                .includes(normalized)
        );
    }, [query]);

    // Derive the active article from the FILTERED list so selection never
    // desyncs from what the nav actually shows. If the search hides the
    // previously selected article we fall back to the first visible result;
    // when nothing matches, activeArticle is null and the panel shows an
    // EmptyState prompting the user to adjust the search.
    const activeArticle =
        filteredArticles.find((article) => article.slug === selectedSlug) ?? filteredArticles[0] ?? null;
    const ActiveIcon = activeArticle?.icon;
    const trimmedQuery = query.trim();
    const resultCount = filteredArticles.length;

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl pb-14">
                <header className="mb-6 border-b border-border pb-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-primary">
                                <BookOpen size={18} />
                                Documentation
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                                MyAppCEO product guide
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                                Context for creating app ideas, importing live apps, preparing listings, checking licenses, integrating APIs, and preparing releases.
                            </p>
                        </div>

                        <div className="w-full lg:max-w-md">
                            <FormField label="Search documentation" hideLabel>
                                {(field) => (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                        <input
                                            {...field}
                                            type="search"
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            placeholder="Search guides, pages, or context..."
                                            className="h-12 w-full rounded-xl bg-muted pl-10 pr-4 text-sm font-semibold text-foreground outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:bg-card focus:ring-primary/30"
                                        />
                                    </div>
                                )}
                            </FormField>
                            {trimmedQuery && (
                                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                                    <span>
                                        {resultCount} {resultCount === 1 ? 'result' : 'results'} for &ldquo;{trimmedQuery}&rdquo;
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
                                        Clear
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <div className="mb-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Guides
                        </div>
                        {resultCount > 0 ? (
                            <Card className="p-2">
                                <nav className="space-y-1" aria-label="Documentation guides">
                                    {filteredArticles.map((article) => {
                                        const Icon = article.icon;
                                        const isActive = article.slug === activeArticle?.slug;

                                        return (
                                            <button
                                                key={article.slug}
                                                type="button"
                                                onClick={() => setSelectedSlug(article.slug)}
                                                aria-current={isActive ? 'page' : undefined}
                                                className={cn(
                                                    'w-full rounded-xl border-l-2 px-3 py-3 text-left transition',
                                                    isActive
                                                        ? 'border-primary bg-primary/10 text-foreground'
                                                        : 'border-transparent text-muted-foreground hover:bg-muted'
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Icon
                                                        size={18}
                                                        className={cn('mt-0.5', isActive ? 'text-primary' : 'text-muted-foreground')}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold">{article.title}</div>
                                                        <div className="mt-1 text-xs opacity-65">{article.category} / {article.readTime}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </Card>
                        ) : (
                            <EmptyState
                                size="sm"
                                icon={Search}
                                title="No guides found"
                                description="No guide matches that search."
                            />
                        )}
                    </aside>

                    <main className="min-w-0">
                        {activeArticle && ActiveIcon ? (
                            <Card className="p-6 sm:p-8">
                                <div className="mb-7 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-primary">
                                            <ActiveIcon size={18} />
                                            {activeArticle.category}
                                            <ChevronRight size={14} />
                                            {activeArticle.audience}
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                            {activeArticle.title}
                                        </h2>
                                        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                                            {activeArticle.summary}
                                        </p>
                                    </div>
                                    <Link
                                        to={activeArticle.page}
                                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                                    >
                                        Open page <ArrowRight size={16} />
                                    </Link>
                                    {activeArticle.docsPath && (
                                        <a
                                            href={docsHref(activeArticle.docsPath)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-muted px-4 text-sm font-bold text-foreground transition hover:bg-muted/70"
                                        >
                                            Docs source <ExternalLink size={16} />
                                        </a>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    {activeArticle.sections.map((section) => (
                                        <section key={section.title}>
                                            <h3 className="text-lg font-black text-foreground">{section.title}</h3>
                                            <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
                                            {section.bullets && (
                                                <ul className="mt-4 space-y-2">
                                                    {section.bullets.map((bullet) => (
                                                        <li key={bullet} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                                                            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={17} />
                                                            <span>{bullet}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </section>
                                    ))}

                                    <section className="rounded-2xl bg-muted p-5">
                                        <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
                                            <ShieldCheck size={18} className="text-primary" />
                                            Checklist
                                        </h3>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            {activeArticle.checklist.map((item) => (
                                                <div key={item} className="flex items-center gap-3 rounded-xl bg-card px-3 py-3 text-sm font-semibold text-muted-foreground">
                                                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </Card>
                        ) : (
                            <EmptyState
                                icon={Search}
                                title="No guide matches your search"
                                description="Try a different term, or clear the search to browse all guides."
                                action={{ label: 'Clear search', onClick: () => setQuery('') }}
                            />
                        )}
                    </main>

                    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                        {activeArticle && (
                            <Card className="p-5">
                                <h3 className="text-sm font-black text-foreground">Document context</h3>
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Page</dt>
                                        <dd className="mt-1 font-semibold text-primary">{activeArticle.page}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Audience</dt>
                                        <dd className="mt-1 font-semibold text-foreground">{activeArticle.audience}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reading time</dt>
                                        <dd className="mt-1 font-semibold text-foreground">{activeArticle.readTime}</dd>
                                    </div>
                                </dl>
                            </Card>
                        )}

                        <Card className="border-primary/15 bg-primary/5 p-5">
                            <h3 className="text-sm font-black text-foreground">Quick links</h3>
                            <div className="mt-4 space-y-2">
                                {QUICK_LINKS.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <Link key={link.href} to={link.href} className="flex items-center justify-between rounded-xl bg-card px-3 py-3 text-sm font-bold text-foreground transition hover:text-primary">
                                            <span className="flex items-center gap-2">
                                                <Icon size={16} className="text-primary" />
                                                {link.label}
                                            </span>
                                            <ArrowRight size={15} />
                                        </Link>
                                    );
                                })}
                            </div>
                        </Card>

                        <Card className="p-5">
                            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
                                <Code2 size={17} className="text-primary" />
                                API reference
                            </h3>
                            <div className="mt-4 space-y-3">
                                {API_REFERENCES.map((link) => (
                                    <ResourceLink key={link.label} href={link.href} label={link.label} body={link.body} forceExternal />
                                ))}
                            </div>
                        </Card>

                        <Card className="p-5">
                            <h3 className="text-sm font-black text-foreground">Docs routing</h3>
                            <div className="mt-4 space-y-3">
                                {DOCS_SOURCE_LINKS.map((link) => (
                                    <ResourceLink key={link.label} href={link.href} label={link.label} body={link.body} />
                                ))}
                            </div>
                        </Card>

                        <Card className="p-5">
                            <h3 className="text-sm font-black text-foreground">Notes</h3>
                            <div className="mt-4 space-y-4">
                                {CONTEXT_NOTES.map((note) => (
                                    <div key={note.title}>
                                        <p className="text-sm font-bold text-foreground">{note.title}</p>
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{note.body}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </aside>
                </div>
            </div>
        </DashboardLayout>
    );
};
