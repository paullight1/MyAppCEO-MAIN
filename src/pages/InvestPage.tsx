import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, Coins, Zap, ChevronRight } from 'lucide-react';
import { useCrowdfunding, CrowdfundingCampaign } from '../hooks/useCrowdfundingSupabase';
import { CampaignCard } from '../components/CampaignCard';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';

export const InvestPage: React.FC = () => {
    const { getCampaigns } = useCrowdfunding();
    const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        setLoading(true);
        setError(null);
        const result = await getCampaigns({ status: 'active' });
        if (result.success && result.data) {
            const data = (result.data as any).data || result.data;
            setCampaigns(Array.isArray(data) ? data : []);
        } else {
            setError((result as any).error || 'We could not load investment pools.');
        }
        setLoading(false);
    };

    const valueProps = [
        {
            title: 'Vetted Assets',
            desc: 'Every app undergoes thorough due diligence by our tech and finance experts before it opens to the community.',
            icon: ShieldCheck,
        },
        {
            title: 'Passive Income',
            desc: 'Earn dividends distributed directly to your wallet without managing day-to-day operations yourself.',
            icon: Coins,
        },
        {
            title: 'Professional Management',
            desc: 'Experienced operators run the acquired apps so your stake is looked after long after you invest.',
            icon: Users,
        },
    ];

    return (
        <Layout>
            <div className="-mt-8 -mx-4 md:-mx-6">
                {/* Hero */}
                <section className="border-b border-border bg-gradient-to-b from-muted to-background px-6 py-20 md:py-28">
                    <div className="mx-auto max-w-[980px]">
                        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                            <Zap size={14} /> Group Investing
                        </div>

                        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
                            Co-Own Profitable Apps.
                        </h1>

                        <p className="mb-12 max-w-[65ch] text-lg leading-relaxed text-muted-foreground md:text-xl">
                            Join community-led investment pools to acquire shares in established digital assets.
                            Professional management ensures operations are handled while you earn dividends.
                        </p>

                        <div className="flex flex-wrap gap-8">
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-primary" />
                                <span className="text-base text-foreground">Community Investors</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Coins size={18} className="text-primary" />
                                <span className="text-base text-foreground">Dividend Distribution</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Active Pools */}
                <section className="bg-background px-6 py-20">
                    <div className="mx-auto max-w-[980px]">
                        <div className="mb-12 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                    Active Investment Pools
                                </h2>
                                <p className="text-base text-muted-foreground md:text-lg">
                                    Verified opportunities currently accepting community capital.
                                </p>
                            </div>
                            <Link
                                to="/campaigns"
                                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                            >
                                View All <ChevronRight size={16} />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                                        <Skeleton className="aspect-[16/9] w-full rounded-none" />
                                        <div className="space-y-3 p-5">
                                            <Skeleton className="h-5 w-2/3" />
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-2.5 w-full rounded-full" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <ErrorState
                                title="Unable to load pools"
                                description="Something went wrong while fetching active investment pools."
                                detail={error}
                                action={{ label: 'Try again', onClick: loadCampaigns }}
                            />
                        ) : campaigns.length === 0 ? (
                            <EmptyState
                                icon={Coins}
                                title="No active investment pools"
                                description="There are no pools accepting capital right now. Browse all campaigns to see what is coming up."
                                action={{ label: 'Browse all campaigns', href: '/campaigns' }}
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                {campaigns.slice(0, 4).map((campaign) => (
                                    <CampaignCard key={campaign.id} campaign={campaign} variant="grid" />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Why Invest */}
                <section className="border-t border-border bg-muted px-6 py-20">
                    <div className="mx-auto max-w-[980px]">
                        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                            Why Invest with Us.
                        </h2>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {valueProps.map((item) => (
                                <div
                                    key={item.title}
                                    className="space-y-5 rounded-2xl border border-border bg-card p-8 transition-all duration-300"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                                        <item.icon size={24} className="text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold text-card-foreground">{item.title}</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
};
