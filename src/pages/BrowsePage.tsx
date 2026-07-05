import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';
import { useMarketplace } from '../hooks/useMarketplace';
import { ListingCard } from '../components/ListingCard';
import { ErrorState, Skeleton } from '../components/ui';
import { ArrowRight, Rocket, TrendingUp, ShieldCheck, Zap, Users, ChevronRight } from 'lucide-react';
import { Listing } from '../../../../packages/types/src';

const HUBS = [
    {
        title: 'Acquire Apps',
        desc: 'Buy established, revenue-generating digital businesses outright.',
        icon: Rocket,
        link: '/marketplace',
        stats: 'Marketplace',
    },
    {
        title: 'Group Invest',
        desc: 'Join fractional investment pools and co-own profitable assets.',
        icon: Users,
        link: '/invest',
        stats: 'Investment',
    },
    {
        title: 'Stake Monitor',
        desc: 'Track your ecosystem rewards and performance in real-time.',
        icon: TrendingUp,
        link: '/stakes',
        stats: 'Staking',
    },
] as const;

const TRUST = [
    {
        title: 'Verified Revenue',
        desc: 'We connect directly to payment processors to ensure all reported revenue is accurate.',
        icon: ShieldCheck,
        tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        title: 'Escrow Protected',
        desc: 'Your funds are held safely in escrow until the asset transfer is fully complete.',
        icon: Zap,
        tone: 'text-amber-600 dark:text-amber-400',
    },
    {
        title: 'Expert Management',
        desc: 'Our team of engineers and marketers manage group-owned apps for consistent growth.',
        icon: Users,
        tone: 'text-primary',
    },
] as const;

const extractListings = (result: { data: unknown } | null): Listing[] => {
    const outer = result?.data as { data?: unknown } | Listing[] | undefined;
    if (Array.isArray(outer)) return outer as Listing[];
    const inner = (outer as { data?: unknown })?.data;
    return Array.isArray(inner) ? (inner as Listing[]) : [];
};

export const BrowsePage: React.FC = () => {
    const [recentListings, setRecentListings] = useState<Listing[]>([]);
    const [investListings, setInvestListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const { getListings } = useMarketplace();

    const fetchBrowseData = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        const [recentResult, investResult] = await Promise.all([
            getListings({ limit: '3' }),
            getListings({ listingType: 'investment' }),
        ]);

        if (!recentResult?.success && !investResult?.success) {
            setLoadError(recentResult?.error || investResult?.error || 'Unable to load listings.');
            setLoading(false);
            return;
        }

        setRecentListings(extractListings(recentResult).slice(0, 3));
        setInvestListings(extractListings(investResult).slice(0, 2));
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchBrowseData();
    }, [fetchBrowseData]);

    const renderSkeletons = (count: number) =>
        Array.from({ length: count }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="space-y-3 p-5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-9 w-full" />
                </div>
            </div>
        ));

    return (
        <Layout>
            <div className="-mt-8 -mx-4 md:-mx-6">
                {/* Hero */}
                <section className="flex min-h-[50dvh] flex-col items-center justify-center bg-foreground px-6 py-20 text-background">
                    <div className="mx-auto max-w-[980px] space-y-6 text-center">
                        <h1 className="text-4xl font-semibold leading-[1.07] tracking-tight sm:text-5xl md:text-6xl">
                            Choose Your Journey.
                        </h1>
                        <p className="mx-auto max-w-[65ch] text-lg leading-relaxed text-background/75 sm:text-xl">
                            Whether you're looking to acquire, invest, or monitor, we have the perfect space for your digital asset growth.
                        </p>
                    </div>
                </section>

                {/* Hub Cards */}
                <section className="bg-muted px-6 py-20">
                    <div className="mx-auto max-w-[980px]">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {HUBS.map((hub) => {
                                const Icon = hub.icon;
                                return (
                                    <Link
                                        to={hub.link}
                                        key={hub.title}
                                        className="group flex min-h-[260px] flex-col rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <Icon size={24} />
                                        </div>
                                        <h3 className="mb-2 text-xl font-semibold text-card-foreground">{hub.title}</h3>
                                        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{hub.desc}</p>
                                        <div className="mt-6 flex items-center justify-between pt-6">
                                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{hub.stats}</span>
                                            <ChevronRight size={16} className="text-primary transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* New Listings */}
                <section className="border-t border-border bg-background px-6 py-20">
                    <div className="mx-auto max-w-[980px] space-y-10">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-semibold text-foreground md:text-4xl">New in Marketplace</h2>
                                <p className="mt-2 text-base text-muted-foreground md:text-lg">Fresh opportunities for full acquisition.</p>
                            </div>
                            <Link to="/marketplace" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
                                View All <ChevronRight size={16} />
                            </Link>
                        </div>

                        {loadError ? (
                            <ErrorState
                                title="Couldn't load listings"
                                description="Something went wrong while fetching the marketplace."
                                detail={loadError}
                                action={{ label: 'Retry', onClick: fetchBrowseData }}
                            />
                        ) : loading ? (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{renderSkeletons(3)}</div>
                        ) : recentListings.length === 0 ? (
                            <p className="py-12 text-center text-muted-foreground">No listings found yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                {recentListings.map((listing) => (
                                    <ListingCard key={listing.id} listing={listing} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Investment Section */}
                <section className="bg-foreground px-6 py-20 text-background">
                    <div className="mx-auto max-w-[980px]">
                        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                                    <Zap size={14} /> High Growth Pools
                                </div>
                                <h2 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                                    Active Investment Opportunities
                                </h2>
                                <p className="max-w-[65ch] text-lg leading-relaxed text-background/75">
                                    Don't have the capital to buy an entire app? Join our verified pools and co-own profitable assets.
                                </p>
                                <Link
                                    to="/invest"
                                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-all hover:bg-primary/90"
                                >
                                    Explore All Pools <ArrowRight size={18} />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {loadError ? (
                                    <div className="rounded-2xl border border-background/15 bg-background/5 p-6 text-center text-sm text-background/70">
                                        Investment pools are unavailable right now.
                                    </div>
                                ) : loading ? (
                                    Array.from({ length: 2 }).map((_, i) => (
                                        <Skeleton key={i} className="h-40 w-full rounded-2xl bg-background/10" />
                                    ))
                                ) : investListings.length === 0 ? (
                                    <div className="rounded-2xl border border-background/15 bg-background/5 p-8 text-center text-sm text-background/70">
                                        No pools currently open.
                                    </div>
                                ) : (
                                    investListings.map((listing) => (
                                        <ListingCard key={listing.id} listing={listing} className="text-left" />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust Section */}
                <section className="border-t border-border bg-muted px-6 py-20">
                    <div className="mx-auto max-w-[980px]">
                        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                            {TRUST.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.title} className="flex gap-5">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                                            <Icon className={item.tone} size={22} />
                                        </div>
                                        <div>
                                            <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                                            <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
};
