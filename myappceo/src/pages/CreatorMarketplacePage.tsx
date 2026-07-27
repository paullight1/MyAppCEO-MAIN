import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import {
    Search,
    Filter,
    Star,
    Users,
    Video,
    Instagram,
    Youtube,
    CheckCircle,
    ChevronRight,
    ExternalLink,
    MessageSquare,
    Award,
    Zap,
    Loader2,
    X,
    DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSocialAutomation } from '../hooks/useSocialAutomation';
import { useCampaigns, Campaign } from '../hooks/useCampaigns';
import { useCreators, TalentProfile } from '../hooks/useCreators';

interface CreatorProfile {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    bio: string;
    niches: string[];
    platforms: string[];
    rate: number;
    reach: number;
    rating: number;
    completedCampaigns: number;
    verified: boolean;
    availability?: TalentProfile['availability'];
    creatorScore?: number;
    portfolio: { type: 'video' | 'image' | 'link'; url: string; title?: string }[];
}

const NICHE_OPTIONS = ['All', 'Gaming', 'SaaS', 'Tech', 'Health', 'Education', 'Lifestyle', 'Business', 'AI', 'Productivity'];
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    tiktok: <span className="text-xs">🎵</span>,
    instagram: <Instagram size={14} />,
    youtube: <Youtube size={14} />,
    linkedin: <span className="text-xs">in</span>,
    meta: <Instagram size={14} />,
};

const RATE_RANGES = [
    { label: 'All', min: 0, max: Infinity },
    { label: '< $500', min: 0, max: 500 },
    { label: '$500 - $1K', min: 500, max: 1000 },
    { label: '$1K - $2K', min: 1000, max: 2000 },
    { label: '$2K+', min: 2000, max: Infinity },
];

export const CreatorMarketplacePage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNiche, setSelectedNiche] = useState('All');
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [selectedRateRange, setSelectedRateRange] = useState(0);
    const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
    const [creators, setCreators] = useState<CreatorProfile[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showHireModal, setShowHireModal] = useState(false);
    const [hireSuccess, setHireSuccess] = useState(false);
    const [contentRequirements, setContentRequirements] = useState('');
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [deadline, setDeadline] = useState('');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const filtersRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const appId = user?.defaultAppId || '';
    const { hireTalent, isLoading: isHiring } = useSocialAutomation();
    const { getCampaignsByApp } = useCampaigns();
    const { getAllTalents, isLoading, error: creatorError } = useCreators();

    const mapTalent = useCallback((talent: TalentProfile): CreatorProfile => {
        const niches = talent.niches?.length
            ? talent.niches
            : talent.niche
                ? [talent.niche]
                : [];
        return {
            id: talent.id,
            username: talent.username || talent.displayName || `creator-${talent.id.slice(0, 6)}`,
            displayName: talent.displayName || talent.username || 'Creator',
            avatar: talent.avatarUrl || '',
            bio: talent.bio || 'This creator has not added a bio yet.',
            niches,
            platforms: talent.platforms || [],
            rate: talent.rate || 0,
            reach: talent.reach || 0,
            rating: talent.rating || 0,
            completedCampaigns: talent.completedCampaigns || 0,
            verified: talent.approved,
            availability: talent.availability,
            creatorScore: talent.creatorScore,
            portfolio: talent.portfolio || (talent.portfolioUrl ? [{ type: 'link', url: talent.portfolioUrl }] : []),
        };
    }, []);

    React.useEffect(() => {
        if (appId) {
            getCampaignsByApp(appId).then(res => {
                if (res?.data) setCampaigns(res.data);
            }).catch(console.error);
        }
    }, [appId, getCampaignsByApp]);

    useEffect(() => {
        let isMounted = true;
        setLoadError(null);
        getAllTalents()
            .then(res => {
                if (!isMounted) return;
                const data = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : [];
                setCreators(data.map(mapTalent));
            })
            .catch(err => {
                if (!isMounted) return;
                setLoadError(err instanceof Error ? err.message : 'Failed to load creators');
                setCreators([]);
            });
        return () => { isMounted = false; };
    }, [getAllTalents, mapTalent]);

    const handleHire = async () => {
        if (!selectedCreator || !appId) return;

        await hireTalent(selectedCreator.id, {
            appId,
            proposal: `Deadline: ${deadline}\n${contentRequirements}`,
            budget: selectedCreator.rate,
            campaignId: selectedCampaignId || undefined,
        });

        // Reset and close
        setContentRequirements('');
        setSelectedCampaignId('');
        setShowHireModal(false);
        setHireSuccess(true);
        setTimeout(() => setHireSuccess(false), 3000);
    };

    // Close whichever modal is open on Escape. Only listen while a modal is open.
    useEffect(() => {
        if (!selectedCreator && !showHireModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showHireModal) {
                setShowHireModal(false);
            } else {
                setSelectedCreator(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCreator, showHireModal]);

    const filteredCreators = useMemo(() => {
        let result = [...creators];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.username.toLowerCase().includes(query) ||
                c.displayName.toLowerCase().includes(query) ||
                c.niches.some(n => n.toLowerCase().includes(query))
            );
        }

        if (selectedNiche !== 'All') {
            result = result.filter(c => c.niches.some(n => n.toLowerCase() === selectedNiche.toLowerCase()));
        }

        if (selectedPlatform) {
            result = result.filter(c => c.platforms.includes(selectedPlatform));
        }

        const rateRange = RATE_RANGES[selectedRateRange];
        result = result.filter(c => c.rate >= rateRange.min && c.rate < rateRange.max);

        return result;
    }, [creators, searchQuery, selectedNiche, selectedPlatform, selectedRateRange]);

    const formatReach = (reach: number) => {
        if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M`;
        if (reach >= 1000) return `${(reach / 1000).toFixed(0)}K`;
        return reach.toString();
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Success Banner */}
                {hireSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                        <span className="text-emerald-500 flex-shrink-0">
                            <AnimatedIcon icon={CheckCircle} size={20} animation="pop" trigger="mount" />
                        </span>
                        <p className="text-emerald-500 text-sm font-medium">Hire request sent successfully!</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center text-white">
                                <AnimatedIcon icon={Users} size={20} animation="pulse" trigger="loop" />
                            </span>
                            UGC Creator Marketplace
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1">Find and hire elite creators to promote your apps</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            aria-label="Scroll to filters"
                            className="group px-5 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
                        >
                            <AnimatedIcon icon={Filter} size={18} animation="wiggle" trigger="hover" /> Filters
                        </button>
                    </div>
                </div>

                {/* Hero Feature */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 rounded-[40px] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#0071e3]/20 rounded-full blur-3xl -mr-20 -mt-20" />
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="space-y-4 max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                                <span className="text-[#4da3ff]">
                                    <AnimatedIcon icon={Zap} size={12} animation="wiggle" trigger="loop" />
                                </span>
                                Verified Creators Only
                            </div>
                            <h2 className="text-3xl font-bold leading-tight">Connect with Creators Who Actually Build Hype</h2>
                            <p className="text-slate-400 text-lg">Browse approved creators from your production marketplace. Hire requests can hand off to escrow after the creator accepts.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Creators', value: creators.length.toLocaleString() },
                                { label: 'Available', value: creators.filter(c => c.availability !== 'unavailable').length.toLocaleString() },
                                { label: 'Verified', value: creators.filter(c => c.verified).length.toLocaleString() },
                                { label: 'Platforms', value: new Set(creators.flatMap(c => c.platforms)).size.toLocaleString() },
                            ].map((s, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm text-center">
                                    <p className="text-xl font-bold text-white">{s.value}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div ref={filtersRef} className="bg-card border border-border rounded-2xl p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by username, name, or niche..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                    </div>

                    {/* Filter Options */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Niche Filter */}
                        <div className="flex-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Niche</label>
                            <div className="flex flex-wrap gap-2">
                                {NICHE_OPTIONS.map(niche => (
                                    <button
                                        key={niche}
                                        onClick={() => setSelectedNiche(niche)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedNiche === niche
                                                ? 'bg-accent text-white'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {niche}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Platform Filter */}
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Platform</label>
                            <div className="flex gap-2">
                                {['tiktok', 'instagram', 'youtube', 'linkedin'].map(platform => (
                                    <button
                                        key={platform}
                                        onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                                        className={`p-2.5 rounded-lg transition-all ${selectedPlatform === platform
                                                ? 'bg-accent text-white'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {PLATFORM_ICONS[platform]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rate Filter */}
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Rate</label>
                            <select
                                value={selectedRateRange}
                                onChange={(e) => setSelectedRateRange(Number(e.target.value))}
                                className="px-3 py-1.5 bg-muted border-0 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                            >
                                {RATE_RANGES.map((range, i) => (
                                    <option key={i} value={i}>{range.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="flex justify-between items-center">
                    <p className="text-muted-foreground font-medium">
                        Showing <span className="text-foreground font-bold">{filteredCreators.length}</span> creators
                    </p>
                </div>

                {(loadError || creatorError) && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-300">
                        Creator marketplace data is unavailable: {loadError || creatorError}
                    </div>
                )}

                {/* Creators Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading creators">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-muted animate-pulse rounded-2xl h-64" />
                        ))}
                    </div>
                ) : filteredCreators.length === 0 ? (
                    <div className="text-center py-20">
                        <Users size={48} className="mx-auto text-muted-foreground/30" />
                        <p className="mt-4 text-muted-foreground font-medium">{creators.length === 0 ? 'No approved creators are available yet' : 'No creators match your filters'}</p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedNiche('All'); setSelectedPlatform(null); setSelectedRateRange(0); }}
                            className="mt-4 px-5 py-2.5 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCreators.map((creator, i) => (
                            <motion.div
                                key={creator.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/30 transition-all group"
                            >
                                {/* Creator Header */}
                                <div className="p-5 border-b border-border">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                            {creator.displayName[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-foreground truncate">@{creator.username}</h3>
                                                {creator.verified && (
                                                    <CheckCircle size={14} className="text-accent flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{creator.displayName}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Star size={12} className="text-amber-400 fill-amber-400" />
                                                <span className="text-sm font-bold text-foreground">{creator.rating ? creator.rating.toFixed(1) : 'Not rated'}</span>
                                                <span className="text-xs text-muted-foreground">({creator.completedCampaigns} campaigns)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Creator Stats */}
                                <div className="p-5 space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-2">{creator.bio}</p>

                                    <div className="flex flex-wrap gap-1.5">
                                        {creator.niches.map(niche => (
                                            <span key={niche} className="px-2 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground">
                                                {niche}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {creator.platforms.map(platform => (
                                                <div key={platform} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                                    {PLATFORM_ICONS[platform]}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Rate</p>
                                            <p className="font-bold text-foreground">${creator.rate.toLocaleString()}/camp</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border">
                                        <div className="flex items-center gap-1">
                                            <Users size={14} className="text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">{creator.reach ? `${formatReach(creator.reach)} reach` : 'Reach unavailable'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedCreator(creator)}
                                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => { setSelectedCreator(creator); setShowHireModal(true); }}
                                                className="group px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                            >
                                                <AnimatedIcon icon={Zap} size={14} animation="pop" trigger="hover" /> Hire
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Creator Profile Modal */}
                <AnimatePresence>
                    {selectedCreator && !showHireModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setSelectedCreator(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                role="dialog"
                                aria-modal="true"
                                aria-label={`Creator profile for @${selectedCreator.username}`}
                                className="bg-card border border-border rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-6 border-b border-border flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">
                                            {selectedCreator.displayName[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-foreground">@{selectedCreator.username}</h3>
                                                {selectedCreator.verified && <CheckCircle size={16} className="text-accent" />}
                                            </div>
                                            <p className="text-muted-foreground">{selectedCreator.displayName}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedCreator(null)}
                                        aria-label="Close creator profile"
                                        className="p-2 rounded-xl hover:bg-muted transition-colors"
                                    >
                                        <X size={20} className="text-muted-foreground" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div>
                                        <h4 className="font-bold text-foreground mb-2">About</h4>
                                        <p className="text-muted-foreground">{selectedCreator.bio}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-muted/50 p-4 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Star size={16} className="text-amber-400 fill-amber-400" />
                                                <span className="text-sm text-muted-foreground">Rating</span>
                                            </div>
                                            <p className="text-2xl font-bold text-foreground">{selectedCreator.rating ? selectedCreator.rating.toFixed(1) : '-'}</p>
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Award size={16} className="text-accent" />
                                                <span className="text-sm text-muted-foreground">Campaigns</span>
                                            </div>
                                            <p className="text-2xl font-bold text-foreground">{selectedCreator.completedCampaigns}</p>
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users size={16} className="text-accent" />
                                                <span className="text-sm text-muted-foreground">Reach</span>
                                            </div>
                                            <p className="text-2xl font-bold text-foreground">{selectedCreator.reach ? formatReach(selectedCreator.reach) : '-'}</p>
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign size={16} className="text-accent" />
                                                <span className="text-sm text-muted-foreground">Rate</span>
                                            </div>
                                            <p className="text-2xl font-bold text-foreground">${selectedCreator.rate.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-foreground mb-2">Niches</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCreator.niches.map(niche => (
                                                <span key={niche} className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-sm font-medium">
                                                    {niche}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-foreground mb-2">Platforms</h4>
                                        <div className="flex gap-2">
                                            {selectedCreator.platforms.map(platform => (
                                                <span key={platform} className="px-3 py-1.5 bg-muted rounded-lg text-sm font-medium text-foreground capitalize flex items-center gap-2">
                                                    {PLATFORM_ICONS[platform]} {platform}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => setSelectedCreator(null)}
                                            className="flex-1 py-3 rounded-xl border border-border font-bold text-foreground hover:bg-muted transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => setShowHireModal(true)}
                                            className="flex-1 py-3 rounded-xl bg-accent text-white font-bold hover:opacity-90 transition-opacity"
                                        >
                                            Hire for Campaign
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hire Modal */}
                <AnimatePresence>
                    {showHireModal && selectedCreator && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowHireModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                role="dialog"
                                aria-modal="true"
                                aria-label={`Hire @${selectedCreator.username} for a campaign`}
                                className="bg-card border border-border rounded-3xl max-w-lg w-full"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-6 border-b border-border">
                                    <h3 className="text-xl font-bold text-foreground">Hire @{selectedCreator.username}</h3>
                                    <p className="text-muted-foreground">Set up your campaign details</p>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-2 block">Select Campaign</label>
                                        <select
                                            value={selectedCampaignId}
                                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                                            className="w-full px-4 py-3 bg-muted border-0 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                                        >
                                            <option value="">-- No specific campaign --</option>
                                            {campaigns.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                            <option value="new">+ Create New Campaign (Draft)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-2 block">Content Requirements</label>
                                        <textarea
                                            placeholder="Describe what content you want..."
                                            value={contentRequirements}
                                            onChange={(e) => setContentRequirements(e.target.value)}
                                            className="w-full px-4 py-3 bg-muted border-0 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-2 block">Deadline</label>
                                        <input
                                            type="date"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full px-4 py-3 bg-muted border-0 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                                        />
                                    </div>

                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-emerald-800">Escrow Protection</p>
                                                <p className="text-sm text-emerald-700">Payment held securely. Creator paid only after you approve content.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-t border-border">
                                        <span className="font-medium text-foreground">Total Cost</span>
                                        <span className="text-2xl font-bold text-foreground">${selectedCreator.rate.toLocaleString()}</span>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowHireModal(false)}
                                            disabled={isHiring}
                                            className="flex-1 py-3 rounded-xl border border-border font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleHire}
                                            disabled={isHiring || !contentRequirements || !deadline}
                                            className="flex-1 py-3 rounded-xl bg-accent text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isHiring ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Launch Campaign'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};
