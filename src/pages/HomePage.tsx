import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarketplace } from '../hooks/useMarketplace';
import { Loader2, AlertCircle, ChevronRight, PlusCircle } from 'lucide-react';
import { Layout } from '../components/Layout';

export const HomePage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [listings, setListings] = useState<any[]>([]);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getListings, isLoading, error } = useMarketplace();

    const categories = ['All', 'SaaS', 'AI Tool', 'Game', 'Mobile App'];

    useEffect(() => {
        const fetchListings = async () => {
            const result = await getListings({ status: 'active', limit: '6' });
            if (result && result.data) {
                const data = (result.data as any).data || result.data;
                if (Array.isArray(data)) setListings(data);
            }
        };
        fetchListings();
    }, []);

    const filteredListings = activeCategory === 'All'
        ? listings
        : listings.filter(l => l.category === activeCategory);

    const handleListApp = () => {
        if (!user) {
            navigate('/auth', { state: { from: { pathname: '/listings/new' } } });
        } else {
            navigate('/listings/new');
        }
    };

    return (
        <Layout>
            <div className="-mt-8 -mx-4 md:-mx-6">
                {/* Hero Section - Asymmetric Layout */}
                <section className="bg-[#0a0a0a] dark:bg-[#0a0a0a] min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="text-center max-w-[980px] mx-auto space-y-8">
                        <h1
                            className="text-white text-[36px] md:text-[56px] font-semibold leading-[1.07] tracking-[-0.028em] transition-colors duration-300"
                            style={{ fontFamily: 'Inter, SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}
                        >
                            Buy, Sell, or Invest in Apps.
                        </h1>
                        <p className="text-white/80 text-[21px] font-normal leading-[1.19] tracking-[0.0231px] max-w-[65ch] mx-auto transition-colors duration-300">
                            Discover profitable digital assets. Buy them outright or join a pool to co-own established apps.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 pt-6 sm:flex-row sm:gap-4">
                            <Link
                                to="/browse"
                                className="inline-flex min-h-12 min-w-[174px] items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-[17px] font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#0077ed] active:scale-[0.98]"
                            >
                                Browse Listings <ChevronRight size={18} />
                            </Link>
                            <button
                                onClick={handleListApp}
                                className="inline-flex min-h-12 min-w-[174px] items-center justify-center gap-2 rounded-full border border-white/70 bg-white px-6 py-3 text-[17px] font-semibold text-[#111113] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#f5f5f7] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/24"
                            >
                                <PlusCircle size={18} /> List Your App
                            </button>
                        </div>
                    </div>
                </section>

                {/* Trust Bar */}
                <section className="bg-white dark:bg-[#0a0a0a] py-12 border-t border-b border-[#1d1d1f]/10 dark:border-white/10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="max-w-[980px] mx-auto flex flex-wrap justify-center gap-16 text-[#1d1d1f]/60 dark:text-white/60 font-semibold text-[12px] tracking-wide uppercase transition-colors duration-300">
                        <span>Verified Revenues</span>
                        <span>Secure Escrow</span>
                        <span>Group Investment</span>
                        <span>Supported Transfer</span>
                    </div>
                </section>

                {/* Featured Section - Bento Grid Layout */}
                <section className="bg-[#f5f5f7] dark:bg-[#0a0a0a] py-20 px-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="max-w-[980px] mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-[#1d1d1f] dark:text-white text-[40px] font-semibold leading-[1.1] tracking-normal transition-colors duration-300">
                                Featured Opportunities
                            </h2>
                            <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                                Curated digital assets ready for acquisition or investment.
                            </p>
                        </div>

                        {/* Category Filter */}
                        <div className="flex justify-center">
                            <div className="inline-flex bg-[#1d1d1f]/5 dark:bg-white/5 rounded-full p-1 transition-colors duration-300">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-5 py-2 rounded-full text-[14px] font-normal transition-all ${activeCategory === cat
                                            ? 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white shadow-sm'
                                            : 'text-[#1d1d1f]/60 dark:text-white/60 hover:text-[#1d1d1f] dark:hover:text-white'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Listings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {isLoading ? (
                                <div className="col-span-full flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="col-span-full flex flex-col items-center gap-4 py-20 text-center">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                    <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] transition-colors duration-300">Failed to load listings.</p>
                                </div>
                            ) : filteredListings.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center gap-4 py-20 text-center">
                                    <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] transition-colors duration-300">No listings available yet.</p>
                                    <p className="text-[14px] text-[#1d1d1f]/48 dark:text-white/48 transition-colors duration-300">Be the first to list your app.</p>
                                </div>
                            ) : (
                                filteredListings.map((listing: any) => (
                                    <Link
                                        key={listing.id}
                                        to={`/listings/${listing.id}`}
                                        className="block bg-white dark:bg-[#1d1d1f] border border-border rounded-[8px] overflow-hidden group transition-all duration-300"
                                    >
                                        <div className="aspect-[16/10] bg-[#f5f5f7] dark:bg-[#000000] overflow-hidden relative transition-colors duration-300">
                                            <img
                                                src={listing.imageUrl}
                                                alt={listing.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] text-[#0071e3] font-semibold uppercase tracking-wide">
                                                    {listing.category}
                                                </span>
                                                {listing.revenueVerified && (
                                                    <span className="text-[12px] text-emerald-600 font-semibold">
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-[#1d1d1f] dark:text-white text-[21px] font-semibold leading-[1.19] tracking-[0.0231px] line-clamp-1 transition-colors duration-300">
                                                {listing.name}
                                            </h3>
                                            <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[14px] leading-[1.29] tracking-[-0.224px] line-clamp-2 transition-colors duration-300">
                                                {listing.shortDescription}
                                            </p>
                                            <div className="flex items-center justify-between pt-4">
                                                <div>
                                                    <p className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide transition-colors duration-300">
                                                        {listing.listingType === 'sale' ? 'Price' : 'From'}
                                                    </p>
                                                    <p className="text-[#1d1d1f] dark:text-white text-[21px] font-semibold transition-colors duration-300">
                                                        {listing.listingType === 'sale'
                                                            ? `$${listing.askingPrice?.toLocaleString() || 'Contact'}`
                                                            : `$${Math.round((listing.askingPrice || 5000) * 0.01).toLocaleString()}`
                                                        }
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide transition-colors duration-300">
                                                        Revenue
                                                    </p>
                                                    <p className="text-[#1d1d1f] dark:text-white text-[17px] font-semibold transition-colors duration-300">
                                                        {listing.monthlyRevenue ? `$${listing.monthlyRevenue.toLocaleString()}/mo` : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>

                        {/* View All Link */}
                        <div className="flex justify-center pt-8">
                            <Link
                                to="/marketplace"
                                className="inline-flex items-center gap-1 text-[#0071e3] text-[14px] font-normal hover:underline transition-all"
                            >
                                View All Listings <ChevronRight size={16} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Investment CTA Section */}
                <section className="bg-white dark:bg-black py-20 px-6 transition-colors duration-300">
                    <div className="max-w-[980px] mx-auto text-center space-y-8">
                        <h2 className="text-[#1d1d1f] dark:text-white text-[36px] md:text-[56px] font-semibold leading-[1.07] tracking-[-0.028em] transition-colors duration-300">
                            Co-own Profitable Apps.
                        </h2>
                        <p className="text-[#1d1d1f]/60 dark:text-white/80 text-[21px] font-normal leading-[1.19] tracking-[0.0231px] max-w-[65ch] mx-auto transition-colors duration-300">
                            You don't need $50,000 to buy an app. Join a group investment pool starting from $500, and earn monthly dividends while MVPLab manages operations.
                        </p>
                        <div className="flex justify-center gap-4 pt-6">
                            <Link
                                to="/invest"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0071e3] text-white text-[17px] font-normal rounded-full transition-all hover:bg-[#0077ed] active:bg-[#006edb]"
                            >
                                Learn More <ChevronRight size={16} />
                            </Link>
                            <Link
                                to="/browse"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-[#1d1d1f] dark:text-white text-[17px] font-normal rounded-full border border-[#1d1d1f]/20 dark:border-white/30 hover:border-[#1d1d1f]/40 dark:hover:border-white/50 transition-all"
                            >
                                Browse Opportunities
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="bg-[#f5f5f7] dark:bg-[#1d1d1f] py-20 px-6 border-t border-[#1d1d1f]/10 dark:border-white/10 transition-colors duration-300">
                    <div className="max-w-[980px] mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                            <div className="space-y-2">
                                <p className="text-[#1d1d1f] dark:text-white text-[48px] font-semibold leading-[1.07] tracking-[-0.028em] transition-colors duration-300">50+</p>
                                <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[14px] tracking-[-0.224px] transition-colors duration-300">Active Listings</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[#1d1d1f] dark:text-white text-[48px] font-semibold leading-[1.07] tracking-[-0.028em] transition-colors duration-300">$2M+</p>
                                <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[14px] tracking-[-0.224px] transition-colors duration-300">Total Value</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[#1d1d1f] dark:text-white text-[48px] font-semibold leading-[1.07] tracking-[-0.028em] transition-colors duration-300">18%</p>
                                <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[14px] tracking-[-0.224px] transition-colors duration-300">Avg. APY</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[#1d1d1f] dark:text-white text-[48px] font-semibold leading-[1.07] tracking-[-0.028em] transition-colors duration-300">100%</p>
                                <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[14px] tracking-[-0.224px] transition-colors duration-300">Verified</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="bg-white dark:bg-[#000000] py-16 px-6 transition-colors duration-300">
                    <div className="max-w-[980px] mx-auto text-center">
                        <p className="text-[#1d1d1f]/60 dark:text-white/60 text-[17px] mb-4 transition-colors duration-300">Ready to start?</p>
                        <Link
                            to="/auth"
                            className="inline-flex items-center gap-2 text-[#0071e3] text-[21px] font-normal hover:underline transition-all"
                        >
                            Create your account <ChevronRight size={20} />
                        </Link>
                    </div>
                </section>
            </div>
        </Layout>
    );
};
