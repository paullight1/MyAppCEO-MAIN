import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    ArrowUpRight,
    Bookmark,
    CheckCircle2,
    ChevronRight,
    Clock,
    Code2,
    DollarSign,
    FileText,
    Lock,
    Mail,
    Monitor,
    PlayCircle,
    Share2,
    ShieldCheck,
    Store,
    TrendingUp,
    Users,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { OfferModal } from '../components/OfferModal';
import { LoadingState, ErrorState } from '../components/ui';
import { useMarketplace } from '../hooks/useMarketplace';
import { useWatchlist } from '../hooks/useWatchlist';
import { calculateAppValuation, ValuationResult } from '../utils/valuation';
import { validateUrl } from '../utils/security';
import { formatCurrency as formatCurrencyBase, formatPercent as formatPercentBase, formatNumber } from '../utils/format';
import { Listing } from '../../../../packages/types/src';

type ListingTab = 'overview' | 'financials' | 'metrics' | 'investment' | 'seller';
type ListingRecord = Listing & Record<string, unknown>;
type OptionalMarketplace = ReturnType<typeof useMarketplace> & {
    trackListingViewOnce?: (listingId: string) => Promise<unknown>;
};

const TABS: { id: ListingTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'investment', label: 'Investment Details' },
    { id: 'seller', label: 'Seller' },
];

const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined);
const asNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};
const asBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

export const ListingDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [listing, setListing] = useState<Listing | null>(null);
    const [valuation, setValuation] = useState<ValuationResult | null>(null);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);
    const [stakePercentage, setStakePercentage] = useState(1);
    const [activeTab, setActiveTab] = useState<ListingTab>('overview');
    const [shareLabel, setShareLabel] = useState('Share');

    const marketplace = useMarketplace() as OptionalMarketplace;
    const { getListingById, isLoading, error } = marketplace;
    const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

    const currency = (listing as { currency?: string } | null)?.currency;
    const formatCurrency = useCallback(
        (value?: number | null) => formatCurrencyBase(value ?? undefined, { currency, maximumFractionDigits: 0 }),
        [currency],
    );
    const formatPercent = (value?: number | null) => formatPercentBase(value ?? undefined);

    const fetchListing = useCallback(async () => {
        if (!id) return;
        const result = await getListingById(id);
        if (result?.data?.data) {
            const listingData = result.data.data;
            setListing(listingData);
            setActiveScreenshot(listingData.imageUrl);
            setValuation(calculateAppValuation(listingData));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        fetchListing();
    }, [fetchListing]);

    // View tracking is de-duplicated inside the hook (trackListingViewOnce);
    // the page no longer keeps its own sessionStorage flag.
    useEffect(() => {
        const track = marketplace.trackListingViewOnce;
        if (!id || typeof track !== 'function') return;
        track(id).catch(() => {
            // Analytics should never block the public listing page.
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const listingRecord = listing as ListingRecord | null;
    const sellerProfile = asRecord(listingRecord?.sellerProfile) || asRecord(listingRecord?.profile) || asRecord(listingRecord?.seller);
    const revenueEvidenceStatus =
        asString(listingRecord?.revenueEvidenceStatus) ||
        asString(listingRecord?.revenueReviewStatus) ||
        asString(listingRecord?.revenueProofStatus);
    const revenueApproved =
        Boolean(listing?.revenueVerified) &&
        (listing?.approvalStage === 'approved' || listing?.status === 'active' || revenueEvidenceStatus === 'approved');
    const validDemoVideoUrl = listing?.demoVideoUrl && validateUrl(listing.demoVideoUrl) ? listing.demoVideoUrl : null;
    const validDocumentationUrl = listing?.documentationUrl && validateUrl(listing.documentationUrl) ? listing.documentationUrl : null;
    const validAppStoreUrl = listing?.appStoreUrl && validateUrl(listing.appStoreUrl) ? listing.appStoreUrl : null;
    const validPlayStoreUrl = listing?.playStoreUrl && validateUrl(listing.playStoreUrl) ? listing.playStoreUrl : null;
    const sellerVerified = Boolean(
        asBoolean(listingRecord?.sellerVerified) ||
        asBoolean(listingRecord?.sellerIdentityVerified) ||
        asBoolean(sellerProfile?.verified) ||
        asString(sellerProfile?.kycStatus) === 'approved' ||
        asString(sellerProfile?.verificationStatus) === 'verified',
    );
    const sellerName =
        asString(sellerProfile?.fullName) ||
        asString(sellerProfile?.name) ||
        asString(sellerProfile?.companyName) ||
        'Marketplace Seller';
    const sellerInitial = sellerName.charAt(0).toUpperCase() || listing?.sellerId?.charAt(0).toUpperCase() || 'S';
    const transferInclusions = useMemo(() => {
        const value = listingRecord?.transferInclusions || listingRecord?.includedAssets;
        if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
        return ['Source code handoff', 'Domain transfer', 'Documentation', 'Operational credentials'];
    }, [listingRecord]);
    const askingOrTarget = listing?.askingPrice ?? listing?.targetRaise ?? 0;
    const minimumOffer =
        asNumber(listingRecord?.minimumOffer) ||
        asNumber(listingRecord?.minimumOfferAmount) ||
        asNumber(listingRecord?.minOfferAmount) ||
        (askingOrTarget ? Math.round(askingOrTarget * 0.8) : 1);
    const stakePrice = valuation ? Math.round((valuation.valuation * stakePercentage) / 100) : 0;
    const projectedAnnualReturn = revenueApproved && listing?.monthlyRevenue
        ? Math.round((listing.monthlyRevenue * 12 * stakePercentage) / 100)
        : 0;
    const techStack = listing?.techStack
        ? (Array.isArray(listing.techStack) ? listing.techStack : listing.techStack.split(',')).map(tech => tech.trim()).filter(Boolean)
        : [];
    const trafficMetrics = asRecord(listingRecord?.trafficMetrics);
    const unitEconomics = asRecord(listingRecord?.unitEconomics);

    const isSaleOnly = listing?.listingType === 'sale';
    const showStakeSlider = !isSaleOnly;
    const watchlisted = listing ? isInWatchlist(listing.id) : false;

    const handleToggleWatchlist = () => {
        if (!listing) return;
        if (watchlisted) removeFromWatchlist(listing.id);
        else addToWatchlist(listing);
    };

    const handleShare = async () => {
        if (typeof window === 'undefined') return;
        const url = window.location.href;
        const shareData = { title: listing?.name || 'MyAppCEO listing', text: listing?.shortDescription, url };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }
            await navigator.clipboard.writeText(url);
            setShareLabel('Link copied');
            setTimeout(() => setShareLabel('Share'), 2000);
        } catch {
            // User cancelled the share sheet — nothing to do.
        }
    };

    if (isLoading && !listing) {
        return (
            <Layout>
                <div className="py-24">
                    <LoadingState variant="spinner" title="Loading listing" />
                </div>
            </Layout>
        );
    }

    if (error || !listing) {
        return (
            <Layout>
                <div className="mx-auto max-w-[560px] px-4 py-24">
                    <ErrorState
                        title={error ? 'Unable to load listing' : 'Listing not found'}
                        description={error ? 'Something went wrong while fetching this listing.' : 'This listing may have been removed or is no longer available.'}
                        detail={error || undefined}
                        action={{ label: 'Retry', onClick: fetchListing }}
                        secondaryAction={{ label: 'Back to marketplace', href: '/marketplace', icon: ArrowLeft }}
                    />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="-mt-8 -mx-4 pb-20 md:-mx-6">
                <section className="min-h-[50dvh] bg-foreground px-6 py-20 text-background">
                    <div className="mx-auto max-w-[980px]">
                        <div className="mb-12 flex flex-wrap items-center justify-between gap-4">
                            <Link to="/marketplace" className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
                                <ArrowLeft size={16} /> Back to Marketplace
                            </Link>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleToggleWatchlist}
                                    aria-pressed={watchlisted}
                                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                                        watchlisted
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-background/20 bg-background/10 text-background hover:bg-background/20'
                                    }`}
                                >
                                    <Bookmark size={15} fill={watchlisted ? 'currentColor' : 'none'} />
                                    {watchlisted ? 'Saved' : 'Save to watchlist'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-4 py-2 text-[13px] font-semibold text-background transition-colors hover:bg-background/20"
                                >
                                    <Share2 size={15} /> {shareLabel}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                            <div className="space-y-6">
                                <div className="group relative aspect-video overflow-hidden rounded-2xl bg-background/10">
                                    <img
                                        src={activeScreenshot || listing.imageUrl}
                                        alt={listing.name}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {validDemoVideoUrl && (
                                        <a
                                            href={validDemoVideoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-5 py-2.5 text-[14px] font-medium text-background backdrop-blur-sm transition-all hover:bg-background/20"
                                        >
                                            <PlayCircle size={16} /> Watch Demo
                                        </a>
                                    )}
                                </div>

                                {listing.screenshots && listing.screenshots.length > 0 && (
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        <button
                                            onClick={() => setActiveScreenshot(listing.imageUrl)}
                                            className={`aspect-video min-w-[120px] overflow-hidden rounded-xl transition-all ${activeScreenshot === listing.imageUrl ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={listing.imageUrl} className="h-full w-full object-cover" alt="Main preview" />
                                        </button>
                                        {listing.screenshots.map((src, i) => (
                                            <button
                                                key={src}
                                                onClick={() => setActiveScreenshot(src)}
                                                className={`aspect-video min-w-[120px] overflow-hidden rounded-xl transition-all ${activeScreenshot === src ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                                            >
                                                <img src={src} className="h-full w-full object-cover" alt={`Screenshot ${i + 1}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-8">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                                        {listing.category}
                                    </span>
                                    <span className="text-[12px] font-semibold uppercase tracking-wide text-background/60">
                                        {listing.listingType.replace('_', ' ')}
                                    </span>
                                    {revenueApproved && (
                                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-400">
                                            <ShieldCheck size={14} /> Verified revenue
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                                        {listing.name}
                                    </h1>
                                    {listing.tagline && (
                                        <p className="mt-4 text-xl font-normal leading-snug text-primary">
                                            {listing.tagline}
                                        </p>
                                    )}
                                </div>

                                <p className="max-w-[65ch] text-[17px] leading-relaxed text-background/80">
                                    {listing.shortDescription}
                                </p>

                                <div className="space-y-6 rounded-2xl border border-background/15 bg-background/5 p-8">
                                    {showStakeSlider ? (
                                        <>
                                            <div className="flex items-end justify-between gap-6">
                                                <div>
                                                    <p className="mb-1 text-[12px] uppercase tracking-wide text-background/60">Ownership Slice</p>
                                                    <p className="text-[40px] font-semibold leading-none">{stakePercentage}%</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="mb-1 text-[12px] uppercase tracking-wide text-background/60">Estimated Price</p>
                                                    <p className="text-[40px] font-semibold leading-none text-primary">{formatCurrency(stakePrice)}</p>
                                                </div>
                                            </div>

                                            <input
                                                type="range"
                                                min="1"
                                                max="100"
                                                value={stakePercentage}
                                                onChange={(e) => setStakePercentage(parseInt(e.target.value, 10))}
                                                aria-label="Ownership slice percentage"
                                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-background/15 accent-primary"
                                            />

                                            <div className="grid grid-cols-2 gap-6 border-t border-background/15 pt-6">
                                                <div>
                                                    <p className="text-[12px] uppercase tracking-wide text-background/60">Est. Annual Return</p>
                                                    <p className="text-[21px] font-semibold text-emerald-400">
                                                        {revenueApproved ? `${formatCurrency(projectedAnnualReturn)}/yr` : 'Pending verification'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[12px] uppercase tracking-wide text-background/60">Expected APY</p>
                                                    <p className="text-[21px] font-semibold text-primary">{formatPercent(listing.projectedApy)}</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-end justify-between gap-6">
                                            <div>
                                                <p className="mb-1 text-[12px] uppercase tracking-wide text-background/60">Asking Price</p>
                                                <p className="text-[40px] font-semibold leading-none text-primary">{formatCurrency(listing.askingPrice)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="mb-1 text-[12px] uppercase tracking-wide text-background/60">Monthly Revenue</p>
                                                <p className="text-[21px] font-semibold text-emerald-400">
                                                    {revenueApproved ? formatCurrency(listing.monthlyRevenue) : 'Pending'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setIsOfferModalOpen(true)}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-[17px] font-medium text-primary-foreground transition-all hover:bg-primary/90"
                                    >
                                        Make Offer <ChevronRight size={18} />
                                    </button>

                                    <p className="text-center text-[12px] uppercase tracking-wide text-background/60">
                                        Secured by MyAppCEO Escrow
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-muted px-6 py-20">
                    <div className="mx-auto max-w-[980px]">
                        <div className="mb-8 flex gap-2 overflow-x-auto pb-4">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${activeTab === tab.id
                                        ? 'bg-foreground text-background'
                                        : 'bg-card text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                            <div className="space-y-8 lg:col-span-2">
                                <div className="rounded-2xl border border-border bg-card p-8 shadow-sm md:p-12">
                                    {activeTab === 'overview' && (
                                        <div className="space-y-10">
                                            <div>
                                                <h2 className="mb-6 text-3xl font-semibold text-foreground">Executive Summary</h2>
                                                <div className="whitespace-pre-wrap text-[17px] leading-relaxed text-muted-foreground">
                                                    {listing.longDescription}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-8 border-t border-border pt-8 md:grid-cols-2">
                                                <div>
                                                    <h4 className="mb-4 flex items-center gap-2 text-[12px] uppercase tracking-wide text-foreground">
                                                        <Code2 size={14} className="text-primary" /> Tech Stack
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {techStack.length > 0 ? techStack.map(tech => (
                                                            <span key={tech} className="rounded-full bg-muted px-3 py-1.5 text-[12px] text-muted-foreground">
                                                                {tech}
                                                            </span>
                                                        )) : <span className="text-muted-foreground">Not specified</span>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="mb-4 flex items-center gap-2 text-[12px] uppercase tracking-wide text-foreground">
                                                        <Lock size={14} className="text-primary" /> Transfer Assets
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {transferInclusions.map(item => (
                                                            <li key={item} className="flex items-center gap-2 text-[14px] text-muted-foreground">
                                                                <CheckCircle2 size={14} className="text-emerald-500" /> {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'financials' && (
                                        <div className="space-y-8">
                                            <h2 className="text-3xl font-semibold text-foreground">Financials</h2>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <MetricCard icon={<DollarSign size={18} />} label="Asking Price" value={formatCurrency(listing.askingPrice)} />
                                                <MetricCard icon={<TrendingUp size={18} />} label="Target Raise" value={formatCurrency(listing.targetRaise)} />
                                                <MetricCard
                                                    icon={<ShieldCheck size={18} />}
                                                    label="Monthly Revenue"
                                                    value={revenueApproved ? formatCurrency(listing.monthlyRevenue) : 'Pending verification'}
                                                />
                                                <MetricCard
                                                    icon={<Monitor size={18} />}
                                                    label="Estimated Worth"
                                                    value={valuation ? formatCurrency(valuation.valuation) : 'Not available'}
                                                />
                                            </div>
                                            {!revenueApproved && (
                                                <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[14px] text-amber-700 dark:text-amber-300">
                                                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                                    Revenue figures are hidden until the listing revenue review is approved.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'metrics' && (
                                        <div className="space-y-8">
                                            <h2 className="text-3xl font-semibold text-foreground">Growth &amp; Performance</h2>
                                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                                <MetricCard icon={<Users size={18} />} label="Users" value={listing.totalUsers != null ? formatNumber(listing.totalUsers) : 'Not disclosed'} />
                                                <MetricCard icon={<Clock size={18} />} label="Age" value={`${listing.ageMonths || 0}mo`} />
                                                <MetricCard icon={<Monitor size={18} />} label="Platform" value={asString(listingRecord?.platform) || listing.storeMetadata?.platform || 'Web'} />
                                                <MetricCard icon={<TrendingUp size={18} />} label="Trust Score" value={listing.trustScore ? `${listing.trustScore}%` : 'Not scored'} />
                                            </div>
                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                <DetailList
                                                    title="Traffic"
                                                    rows={[
                                                        ['Monthly visitors', asNumber(trafficMetrics?.monthlyVisitors) != null ? formatNumber(asNumber(trafficMetrics?.monthlyVisitors)) : 'Not disclosed'],
                                                        ['Bounce rate', formatPercent(asNumber(trafficMetrics?.bounceRate))],
                                                        ['Avg. session', asString(trafficMetrics?.avgSessionDuration) || String(trafficMetrics?.avgSessionDuration || 'Not disclosed')],
                                                    ]}
                                                />
                                                <DetailList
                                                    title="Unit Economics"
                                                    rows={[
                                                        ['CAC', formatCurrency(asNumber(unitEconomics?.cac))],
                                                        ['LTV', formatCurrency(asNumber(unitEconomics?.ltv))],
                                                        ['MRR churn', formatPercent(asNumber(unitEconomics?.mrrChurn))],
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'investment' && (
                                        <div className="space-y-8">
                                            <h2 className="text-3xl font-semibold text-foreground">Investment Details</h2>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <MetricCard icon={<DollarSign size={18} />} label="Minimum Offer" value={formatCurrency(minimumOffer)} />
                                                <MetricCard icon={<Users size={18} />} label="Equity Available" value={formatPercent(listing.equityAvailable)} />
                                                <MetricCard icon={<TrendingUp size={18} />} label="Projected APY" value={formatPercent(listing.projectedApy)} />
                                                <MetricCard icon={<ShieldCheck size={18} />} label="Transaction Type" value={listing.listingType} />
                                            </div>
                                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                                                Offers are routed through the marketplace offer workflow. Accepted offers can move into escrow for funding, inspection, transfer confirmation, and release.
                                            </p>
                                        </div>
                                    )}

                                    {activeTab === 'seller' && (
                                        <div className="space-y-8">
                                            <h2 className="text-3xl font-semibold text-foreground">Seller</h2>
                                            <div className="flex items-center gap-5 rounded-xl bg-muted p-6">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-card text-[28px] font-semibold text-foreground shadow-sm">
                                                    {sellerInitial}
                                                </div>
                                                <div>
                                                    <p className="text-[21px] font-semibold text-foreground">{sellerName}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        {sellerVerified ? (
                                                            <>
                                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                                                <span className="text-[12px] uppercase tracking-wide text-muted-foreground">Verified seller</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle size={14} className="text-amber-500" />
                                                                <span className="text-[12px] uppercase tracking-wide text-muted-foreground">Verification not shown</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-4 rounded-xl border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-start gap-3">
                                                    <Mail size={18} className="mt-0.5 shrink-0 text-primary" />
                                                    <div>
                                                        <p className="text-[15px] font-semibold text-foreground">Have a question about this asset?</p>
                                                        <p className="mt-1 text-[14px] text-muted-foreground">Send an offer with a message and the seller can reply directly.</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setIsOfferModalOpen(true)}
                                                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] font-medium text-primary-foreground transition-all hover:bg-primary/90"
                                                >
                                                    Contact seller <ChevronRight size={16} />
                                                </button>
                                            </div>
                                            <p className="text-[15px] text-muted-foreground">
                                                Seller identity is displayed only from listing or profile verification fields exposed by the backend.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-8">
                                {(validAppStoreUrl || validPlayStoreUrl) && (
                                    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                                        <h3 className="mb-6 flex items-center gap-2 text-[12px] uppercase tracking-wide text-foreground">
                                            <Store size={14} className="text-primary" /> Store Source
                                        </h3>
                                        <div className="space-y-3">
                                            {validAppStoreUrl ? (
                                                <a href={validAppStoreUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-[14px] font-semibold text-foreground transition-colors hover:text-primary">
                                                    Apple App Store <ArrowUpRight size={15} />
                                                </a>
                                            ) : null}
                                            {validPlayStoreUrl ? (
                                                <a href={validPlayStoreUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-[14px] font-semibold text-foreground transition-colors hover:text-primary">
                                                    Google Play <ArrowUpRight size={15} />
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                                    <h3 className="mb-8 text-[12px] uppercase tracking-wide text-foreground">Public Financial Snapshot</h3>
                                    <div className="flex items-end justify-between border-b border-border pb-6">
                                        <span className="text-[12px] uppercase tracking-wide text-muted-foreground">Monthly Revenue</span>
                                        <span className="flex items-center gap-2 text-[21px] font-semibold text-foreground">
                                            {revenueApproved ? formatCurrency(listing.monthlyRevenue) : 'Pending'}
                                            {revenueApproved && <ShieldCheck size={16} className="text-emerald-500" />}
                                        </span>
                                    </div>

                                    {valuation && (
                                        <div className="mt-8 rounded-xl bg-foreground p-6 text-background">
                                            <p className="mb-1 text-[12px] uppercase tracking-wide text-background/60">Estimated Worth</p>
                                            <p className="mb-4 text-3xl font-semibold leading-tight">{formatCurrency(valuation.valuation)}</p>
                                            <div className="flex justify-between border-t border-background/15 pt-4 text-[12px] uppercase tracking-wide text-background/60">
                                                <span>{valuation.tier} Tier</span>
                                                <span>{valuation.multiple}x Multiple</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                                    <h3 className="mb-6 text-[12px] uppercase tracking-wide text-foreground">Data Room Access</h3>
                                    <div className="space-y-4">
                                        {validDocumentationUrl ? (
                                            <a href={validDocumentationUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between rounded-xl bg-muted p-5 transition-all hover:bg-primary/10">
                                                <div className="flex items-center gap-4">
                                                    <FileText size={20} className="text-primary" />
                                                    <span className="text-[17px] font-normal text-foreground">Documentation</span>
                                                </div>
                                                <ChevronRight size={16} className="text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                                            </a>
                                        ) : null}
                                        <div className="rounded-xl bg-muted p-5 text-center">
                                            <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
                                                Repository and private assets are released through escrow.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-foreground p-8 text-background">
                                    <div className="flex items-center gap-5">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-background text-[28px] font-semibold text-foreground shadow-sm">
                                            {sellerInitial}
                                        </div>
                                        <div>
                                            <p className="text-[21px] font-semibold">{sellerVerified ? 'Verified Seller' : 'Seller'}</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                {sellerVerified ? <CheckCircle2 size={12} className="text-emerald-400" /> : <AlertCircle size={12} className="text-amber-400" />}
                                                <span className="text-[12px] uppercase tracking-wide text-background/60">
                                                    {sellerVerified ? 'Identity confirmed' : 'Verification pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveTab('seller')} className="mt-10 block w-full rounded-full border border-background/20 bg-background/10 py-4 text-center text-[17px] font-medium text-background transition-all hover:bg-background/20">
                                        View Seller Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <OfferModal
                isOpen={isOfferModalOpen}
                onClose={() => setIsOfferModalOpen(false)}
                listingId={listing.id}
                listingName={listing.name}
                askingPrice={listing.askingPrice ?? listing.targetRaise ?? null}
            />
        </Layout>
    );
};

const MetricCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="rounded-xl bg-muted p-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
        </div>
        <p className="mb-1 text-[12px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-[20px] font-semibold text-foreground">{value}</p>
    </div>
);

const DetailList = ({ title, rows }: { title: string; rows: [string, string][] }) => (
    <div className="rounded-xl border border-border p-5">
        <h3 className="mb-4 text-[12px] uppercase tracking-wide text-foreground">{title}</h3>
        <div className="space-y-3">
            {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-[14px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                </div>
            ))}
        </div>
    </div>
);
