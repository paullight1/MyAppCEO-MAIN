import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
    Megaphone,
    Zap,
    Plus,
    ExternalLink,
    ChevronRight,
    ShieldCheck,
    MessageSquare,
    Play
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedIcon, GroupHoverIcon } from '../components/ui/AnimatedIcon';
import { getStatusStyle } from '../utils/statusStyles';
import { useAuth } from '../hooks/useAuth';
import { useCampaigns, Campaign } from '../hooks/useCampaigns';
import { useCreators, UGCContent } from '../hooks/useCreators';

export const CreatorsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const appId = user?.defaultAppId || '';
    const { getCampaignsByApp, isLoading: campaignsLoading } = useCampaigns();
    const { getRecentUGC, isLoading: ugcLoading } = useCreators();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [ugc, setUgc] = useState<UGCContent[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            setError(null);
            try {
                const [campaignResult, ugcResult] = await Promise.all([
                    appId ? getCampaignsByApp(appId) : Promise.resolve(null),
                    getRecentUGC(),
                ]);
                if (!isMounted) return;
                const campaignData = Array.isArray(campaignResult)
                    ? campaignResult
                    : Array.isArray(campaignResult?.data)
                        ? campaignResult.data
                        : [];
                const ugcData = Array.isArray(ugcResult)
                    ? ugcResult
                    : Array.isArray(ugcResult?.data)
                        ? ugcResult.data
                        : [];
                setCampaigns(campaignData);
                setUgc(ugcData);
            } catch (err) {
                if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load creator program data');
            }
        };
        load();
        return () => { isMounted = false; };
    }, [appId, getCampaignsByApp, getRecentUGC]);

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">UGC Creator Programs</h1>
                        <p className="text-muted-foreground font-medium">Partner with elite creators to scale your app's visibility.</p>
                    </div>
                    <Link to="/campaigns/new" className="accent-button flex items-center gap-2 group">
                        <AnimatedIcon icon={Plus} size={18} animation="pop" /> New Campaign
                    </Link>
                </div>

                {/* Hero Feature (intentionally dark in both themes) */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-10 rounded-[40px] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#0071e3]/20 rounded-full blur-3xl -mr-20 -mt-20" />
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                                <AnimatedIcon icon={Zap} size={12} animation="wiggle" trigger="loop" className="text-[#0071e3]" />
                                AI-Powered Matching Active
                            </div>
                            <h2 className="text-4xl font-bold leading-tight">Connect with Creators Who Actually Build Hype</h2>
                            <p className="text-white/70 text-lg leading-relaxed">Track real creator campaigns and approved UGC submissions. Payments can move to escrow once a creator accepts a hire request.</p>
                            <div className="flex flex-wrap gap-4">
                                <Link to="/promote/creators" className="accent-button px-8">Find Creators</Link>
                                <button
                                    onClick={() => navigate('/promote/analytics')}
                                    className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                                >
                                    Learn How it Works <ExternalLink size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Campaigns', value: campaigns.length.toLocaleString() },
                                { label: 'Active', value: campaigns.filter(c => c.status === 'active').length.toLocaleString() },
                                { label: 'UGC', value: ugc.length.toLocaleString() },
                                { label: 'Pending', value: ugc.filter(item => item.status === 'pending').length.toLocaleString() }
                            ].map((s, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                                    <p className="text-2xl font-bold text-white">{s.value}</p>
                                    <p className="text-xs font-bold text-white/50 uppercase tracking-widest mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-300">
                        Creator program data is unavailable: {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Campaigns */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <AnimatedIcon icon={Megaphone} size={20} animation="wiggle" trigger="loop" className="text-[#0071e3]" />
                            Your Active Campaigns
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {campaignsLoading ? (
                                <div className="bg-card p-8 rounded-3xl border border-border text-center text-muted-foreground">Loading creator campaigns...</div>
                            ) : campaigns.length === 0 ? (
                                <div className="bg-card p-8 rounded-3xl border border-border text-center">
                                    <p className="font-bold text-foreground">No creator campaigns yet</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Create a campaign or hire a creator to start collecting UGC performance.</p>
                                </div>
                            ) : campaigns.map((camp, i) => (
                                <motion.div
                                    key={camp.id || i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-card p-6 rounded-3xl border border-border transition-all group flex justify-between items-center"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                                            <Play size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">{camp.name}</h4>
                                            <p className="text-xs font-medium text-muted-foreground">Budget: <span className="text-foreground font-bold">${Number(camp.budget || 0).toLocaleString()}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Live campaign</p>
                                            <span className={`status-badge mt-1 inline-block ${getStatusStyle(camp.status).badge}`}>
                                                {camp.status}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/campaigns/${camp.id}`)}
                                            aria-label={`View ${camp.name}`}
                                            className="p-3 rounded-xl bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/70 transition-all"
                                        >
                                            <GroupHoverIcon icon={ChevronRight} size={20} animation="translate-x" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Creator Inbox & Support */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <AnimatedIcon icon={MessageSquare} size={20} animation="wiggle" trigger="loop" className="text-[#0071e3]" />
                            Creator Hub
                        </h3>
                        <div className="bg-card p-8 rounded-[40px] border border-border space-y-6">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3">
                                <ShieldCheck className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 leading-relaxed">All payments are held in <span className="font-bold">MY APPCEO Escrow</span>. Creators are paid only after you approve the content.</p>
                            </div>
                            <button
                                onClick={() => navigate('/promote/creators')}
                                className="w-full py-4 rounded-2xl border border-border text-sm font-bold text-foreground hover:bg-[#1a1a2e] hover:text-white hover:border-transparent transition-all"
                            >
                                Open Creator Inbox
                            </button>
                            <button
                                onClick={() => navigate('/promote/creators')}
                                className="w-full py-4 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
                            >
                                {ugcLoading ? 'Loading UGC...' : `Recent UGC (${ugc.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
