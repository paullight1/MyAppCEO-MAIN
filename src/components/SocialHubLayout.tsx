import React, { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { VideoUploadModal } from '../components/VideoUploadModal';
import { SchedulePostModal } from '../components/SchedulePostModal';
import { AutomationBuilderModal } from '../components/AutomationBuilderModal';
import { useSocialAutomation, SocialAccount, OAuthPlatform } from '../hooks/useSocialAutomation';
import { useScheduler, ScheduledPost } from '../hooks/useScheduler';
import { useAutomation, Automation } from '../hooks/useAutomation';
import { AnimatedIcon, GroupHoverIcon } from './ui/AnimatedIcon';
import {
    LayoutDashboard,
    FileText as FileTextIcon,
    Calendar,
    Zap,
    Link2,
    BarChart3,
    CalendarDays,
    Video,
    MoreHorizontal,
    TrendingUp,
    Unlink,
    Instagram,
    Twitter,
    Youtube,
    Facebook,
    Plus,
    Upload,
    MessageSquare,
    Users,
    X,
    ExternalLink,
    Shield,
    type LucideIcon,
} from 'lucide-react';

// Platform-accurate icon + brand color, used wherever a connected account is shown.
const PLATFORM_VISUALS: Record<string, { icon: LucideIcon; gradient: string }> = {
    instagram: { icon: Instagram, gradient: 'from-purple-600 to-pink-500' },
    meta: { icon: Facebook, gradient: 'from-blue-600 to-indigo-600' },
    facebook: { icon: Facebook, gradient: 'from-blue-600 to-indigo-600' },
    twitter: { icon: Twitter, gradient: 'from-slate-700 to-black' },
    tiktok: { icon: Video, gradient: 'from-slate-800 to-black' },
    youtube: { icon: Youtube, gradient: 'from-red-500 to-red-600' },
};

const platformVisual = (platform: string) =>
    PLATFORM_VISUALS[platform] ?? { icon: Link2, gradient: 'from-slate-500 to-slate-600' };

type TabType = 'overview' | 'content' | 'calendar' | 'automations' | 'accounts' | 'analytics';

const TABS = [
    { id: 'overview' as TabType, name: 'Overview', icon: LayoutDashboard },
    { id: 'content' as TabType, name: 'Content', icon: FileTextIcon },
    { id: 'calendar' as TabType, name: 'Calendar', icon: Calendar },
    { id: 'automations' as TabType, name: 'Automations', icon: Zap },
    { id: 'accounts' as TabType, name: 'Accounts', icon: Link2 },
    { id: 'analytics' as TabType, name: 'Analytics', icon: BarChart3 },
];

interface SocialHubContextType {
    onOpenConnectModal: () => void;
    onOpenScheduleModal: () => void;
    onOpenVideoModal: () => void;
    onOpenAutomationModal: () => void;
}

const SocialHubContext = createContext<SocialHubContextType | null>(null);

export const useSocialHub = () => {
    const ctx = useContext(SocialHubContext);
    if (!ctx) throw new Error('useSocialHub must be used within SocialHubLayout');
    return ctx;
};

interface SocialHubLayoutProps {
    appId: string;
    children: React.ReactNode;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export const SocialHubLayout: React.FC<SocialHubLayoutProps> = ({
    appId,
    children,
    activeTab,
    onTabChange,
}) => {
    const { getConnectedAccounts, getOAuthUrl, disconnectAccount } = useSocialAutomation();
    const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showAutomationBuilderModal, setShowAutomationBuilderModal] = useState(false);

    useEffect(() => {
        const fetchAccounts = async () => {
            const result = await getConnectedAccounts(appId);
            const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
            setConnectedAccounts(data);
        };
        fetchAccounts();
    }, [appId]);

    // Close the connect modal on Escape.
    useEffect(() => {
        if (!showConnectModal) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowConnectModal(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showConnectModal]);

    const handleConnect = async (platform: OAuthPlatform) => {
        const result = await getOAuthUrl(platform, appId);
        if (result?.authUrl) window.location.href = result.authUrl;
    };

    const handleDisconnect = async (accountId: string) => {
        const result = await disconnectAccount(accountId);
        if (result?.success) setConnectedAccounts(prev => prev.filter(a => a.id !== accountId));
    };

    const contextValue: SocialHubContextType = {
        onOpenConnectModal: () => setShowConnectModal(true),
        onOpenScheduleModal: () => setShowScheduleModal(true),
        onOpenVideoModal: () => setShowVideoUploadModal(true),
        onOpenAutomationModal: () => setShowAutomationBuilderModal(true),
    };

    return (
        <DashboardLayout>
            {/* Connect modal — only mounted when open so it never traps clicks. */}
            {showConnectModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Connect a social platform"
                >
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowConnectModal(false)}
                    />
                    <ConnectPlatformModalContent
                        onClose={() => setShowConnectModal(false)}
                        onConnect={handleConnect}
                        connectedPlatforms={connectedAccounts.map(a => a.platform)}
                    />
                </div>
            )}

            <VideoUploadModal isOpen={showVideoUploadModal} onClose={() => setShowVideoUploadModal(false)} appId={appId} connectedAccounts={connectedAccounts} />
            <SchedulePostModal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} appId={appId} connectedAccounts={connectedAccounts} />
            <AutomationBuilderModal isOpen={showAutomationBuilderModal} onClose={() => setShowAutomationBuilderModal(false)} appId={appId} connectedAccounts={connectedAccounts} />

            <SocialHubContext.Provider value={contextValue}>
                <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white tracking-tight">Social CEO Hub</h1>
                            <p className="text-[#1d1d1f]/50 dark:text-white/50 font-medium mt-1">Manage all your social media in one place.</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setShowScheduleModal(true)} className="group flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl font-bold text-xs hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-all text-[#1d1d1f] dark:text-white active:scale-[0.98]">
                                <AnimatedIcon icon={CalendarDays} size={14} animation="bounce" /> Schedule
                            </button>
                            <button onClick={() => setShowVideoUploadModal(true)} className="group flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl font-bold text-xs hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-all text-[#1d1d1f] dark:text-white active:scale-[0.98]">
                                <AnimatedIcon icon={Upload} size={14} animation="float" /> Upload
                            </button>
                            <button onClick={() => setShowAutomationBuilderModal(true)} className="group flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] text-white rounded-xl font-bold text-xs hover:bg-[#0077ed] active:scale-[0.98] transition-all">
                                <AnimatedIcon icon={Zap} size={14} animation="wiggle" /> New Automation
                            </button>
                        </div>
                    </div>

                    {/* Mobile Tabs */}
                    <div className="md:hidden flex gap-1.5 overflow-x-auto pb-4 mb-6 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${isActive ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] dark:bg-[#1e1e20] text-[#1d1d1f]/50 dark:text-white/50 border border-[#1d1d1f]/8 dark:border-white/8'}`}>
                                    <Icon size={14} /> {tab.name}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-6">
                        {/* Desktop Sidebar */}
                        <div className="w-48 shrink-0 hidden md:block">
                            <nav className="sticky top-24 space-y-1">
                                {TABS.map(tab => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${isActive ? 'bg-[#0071e3] text-white' : 'text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#1e1e20]'}`}>
                                            <Icon size={16} /> {tab.name}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">{children}</div>
                    </div>
                </div>
            </SocialHubContext.Provider>
        </DashboardLayout>
    );
};

// Connect Modal Content
interface ConnectPlatformModalContentProps {
    onClose: () => void;
    onConnect: (platform: OAuthPlatform) => void;
    connectedPlatforms: string[];
}

const ConnectPlatformModalContent: React.FC<ConnectPlatformModalContentProps> = ({ onClose, onConnect, connectedPlatforms }) => {
    const PLATFORMS = [
        { id: 'meta' as OAuthPlatform, name: 'Meta (Facebook/Instagram)', icon: Instagram, color: 'bg-gradient-to-r from-purple-600 to-pink-500' },
        { id: 'tiktok' as OAuthPlatform, name: 'TikTok', icon: Video, color: 'bg-black' },
        { id: 'twitter' as OAuthPlatform, name: 'X (Twitter)', icon: Twitter, color: 'bg-black' },
    ];

    return (
        <div className="relative bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors" aria-label="Close">
                <X size={16} className="text-[#1d1d1f]/40 dark:text-white/40" />
            </button>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-1">Connect Platform</h2>
            <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50 mb-6">Link your social media accounts.</p>
            <div className="space-y-2">
                {PLATFORMS.map(platform => {
                    const isConnected = connectedPlatforms.includes(platform.id);
                    const Icon = platform.icon;
                    return (
                        <button key={platform.id} onClick={() => !isConnected && onConnect(platform.id)} disabled={isConnected} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${isConnected ? 'bg-[#f5f5f7] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 opacity-60 cursor-not-allowed' : 'bg-[#fafafa] dark:bg-[#111] border border-[#1d1d1f]/8 dark:border-white/8 hover:border-[#0071e3]/30'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-white shadow-sm`}><Icon size={20} /></div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{platform.name}</p>
                                    <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40">{isConnected ? 'Connected' : 'Requires API Authorization'}</p>
                                </div>
                            </div>
                            {isConnected ? (
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-emerald-500 text-xs font-bold">Active</span></div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-[#0071e3]"><span className="text-[10px] font-bold uppercase tracking-wider">Connect</span><ExternalLink size={12} /></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Overview Tab ───────────────────────────────────────────────────────────────

interface OverviewTabProps {
    appId: string;
    connectedAccounts: SocialAccount[];
    onDisconnect: (accountId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ appId, connectedAccounts, onDisconnect }) => {
    const navigate = useNavigate();
    const { getScheduledPosts } = useScheduler();
    const { getAutomations } = useAutomation();
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [automations, setAutomations] = useState<Automation[]>([]);
    const socialHub = useSocialHub();

    useEffect(() => {
        const fetchData = async () => {
            const [scheduledResult, automationsResult] = await Promise.all([getScheduledPosts(appId), getAutomations(appId)]);
            const scheduledData = Array.isArray(scheduledResult) ? scheduledResult : Array.isArray(scheduledResult?.data) ? scheduledResult.data : [];
            const automationData = Array.isArray(automationsResult) ? automationsResult : Array.isArray(automationsResult?.data) ? automationsResult.data : [];
            setScheduledPosts(scheduledData);
            setAutomations(automationData);
        };
        fetchData();
    }, [appId]);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Connected', value: connectedAccounts.length, sub: 'Platforms', icon: Link2, color: 'text-[#0071e3]', bg: 'bg-[#0071e3]/10' },
                    { label: 'Scheduled', value: scheduledPosts.filter(p => p.status === 'pending').length, sub: 'Posts', icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Active', value: automations.filter(a => a.status === 'active').length, sub: 'Automations', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Published', value: scheduledPosts.filter(p => p.status === 'published').length, sub: 'Posts', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}><Icon size={16} className={stat.color} /></div>
                                <span className="text-[10px] font-bold text-[#1d1d1f]/40 dark:text-white/40 uppercase">{stat.label}</span>
                            </div>
                            <p className="text-2xl font-black text-[#1d1d1f] dark:text-white">{stat.value}</p>
                            <p className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30">{stat.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Connected Accounts */}
            <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2"><Link2 size={16} className="text-[#0071e3]" />Connected Accounts</h3>
                    <button onClick={socialHub.onOpenConnectModal} className="text-xs font-bold text-[#0071e3] hover:underline">+ Add Account</button>
                </div>
                {connectedAccounts.length === 0 ? (
                    <div className="text-center py-8">
                        <Link2 size={36} className="mx-auto mb-3 text-[#1d1d1f]/15 dark:text-white/15" />
                        <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">No accounts connected</p>
                        <button onClick={socialHub.onOpenConnectModal} className="mt-3 px-5 py-2 bg-[#0071e3] text-white rounded-xl font-bold text-xs hover:bg-[#0077ed] transition-all">Connect Account</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {connectedAccounts.map(account => {
                            const visual = platformVisual(account.platform);
                            const PlatformIcon = visual.icon;
                            return (
                                <div key={account.id} className="group flex items-center gap-3 p-3 bg-[#fafafa] dark:bg-[#111] rounded-lg border border-transparent hover:border-[#0071e3]/20 transition-colors">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${visual.gradient} flex items-center justify-center text-white shadow-sm`}>
                                        <PlatformIcon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#1d1d1f] dark:text-white capitalize">{account.platform}</p>
                                        <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40 truncate">@{account.username || account.accountHandle || 'connected'}</p>
                                        {account.status && account.status !== 'active' && (
                                            <p className="text-[10px] font-bold text-amber-500 capitalize">{account.status.replace('_', ' ')}</p>
                                        )}
                                    </div>
                                    <button onClick={() => onDisconnect(account.id)} className="p-1.5 text-[#1d1d1f]/30 dark:text-white/30 hover:text-red-500 transition-colors" aria-label={`Disconnect ${account.platform}`}><Unlink size={14} /></button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={socialHub.onOpenVideoModal} className="p-5 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl hover:border-[#0071e3]/30 hover:shadow-md transition-all text-left group active:scale-[0.99]">
                    <div className="w-10 h-10 rounded-lg bg-[#0071e3]/10 flex items-center justify-center mb-3"><GroupHoverIcon icon={Video} size={20} animation="scale" className="text-[#0071e3]" /></div>
                    <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-0.5">Upload Video</h4>
                    <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">Post a video to connected accounts</p>
                </button>
                <button onClick={socialHub.onOpenScheduleModal} className="p-5 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl hover:border-[#0071e3]/30 hover:shadow-md transition-all text-left group active:scale-[0.99]">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3"><GroupHoverIcon icon={CalendarDays} size={20} animation="scale" className="text-blue-500" /></div>
                    <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-0.5">Schedule Post</h4>
                    <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">Plan content for later</p>
                </button>
                <button onClick={() => navigate('/promote/creators')} className="p-5 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl hover:border-[#0071e3]/30 hover:shadow-md transition-all text-left group active:scale-[0.99]">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3"><GroupHoverIcon icon={Users} size={20} animation="scale" className="text-purple-500" /></div>
                    <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-0.5">Hire Creators</h4>
                    <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">Launch UGC campaigns with talent</p>
                </button>
            </div>
        </div>
    );
};

// ─── Content/Posts Tab ───────────────────────────────────────────────────────────

interface ContentTabProps {
    appId: string;
}

export const ContentTab: React.FC<ContentTabProps> = ({ appId }) => {
    const { getScheduledPosts } = useScheduler();
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'published'>('all');

    useEffect(() => {
        const fetchPosts = async () => {
            const result = await getScheduledPosts(appId);
            const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
            setPosts(data);
        };
        fetchPosts();
    }, [appId]);

    const filteredPosts = posts.filter(p => filter === 'all' || p.status === filter);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
            case 'published': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            case 'failed': return 'bg-red-500/10 text-red-600 dark:text-red-400';
            default: return 'bg-[#f5f5f7] dark:bg-[#111] text-[#1d1d1f]/40 dark:text-white/40';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-1.5">
                {(['all', 'pending', 'published'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg font-bold text-xs capitalize transition-all ${filter === f ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] dark:bg-[#1e1e20] text-[#1d1d1f]/50 dark:text-white/50 border border-[#1d1d1f]/8 dark:border-white/8 hover:border-[#0071e3]/30'}`}>
                        {f}
                    </button>
                ))}
            </div>

            {filteredPosts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl">
                    <FileTextIcon size={36} className="mx-auto mb-3 text-[#1d1d1f]/15 dark:text-white/15" />
                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">No posts yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredPosts.map(post => (
                        <div key={post.id} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-[#f5f5f7] dark:bg-[#111] flex items-center justify-center flex-shrink-0 border border-[#1d1d1f]/8 dark:border-white/8">
                                {post.mediaUrls?.[0] ? <img src={post.mediaUrls[0]} alt="" className="w-full h-full object-cover rounded-lg" /> : <FileTextIcon size={18} className="text-[#1d1d1f]/30 dark:text-white/30" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white line-clamp-2">{post.content}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${getStatusColor(post.status)}`}>{post.status}</span>
                                    <span className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30">{new Date(post.scheduledAt).toLocaleDateString()}</span>
                                    <div className="flex gap-1">
                                        {post.platforms?.map(p => (<span key={p} className="px-1.5 py-0.5 bg-[#f5f5f7] dark:bg-[#111] rounded text-[10px] text-[#1d1d1f]/40 dark:text-white/40 capitalize">{p}</span>))}
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 rounded-lg bg-[#f5f5f7] dark:bg-[#111] text-[#1d1d1f]/30 dark:text-white/30 hover:text-[#1d1d1f] dark:hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const CalendarTab: React.FC<{ appId: string }> = ({ appId }) => {
    const { getCalendarData } = useScheduler();
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 30);
        getCalendarData(appId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10))
            .then(result => {
                if (!isMounted) return;
                const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
                setPosts(data);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [appId, getCalendarData]);

    if (loading) {
        return <div className="text-center py-16 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl text-sm text-[#1d1d1f]/50 dark:text-white/50">Loading calendar...</div>;
    }

    return (
        <div className="space-y-3">
            {posts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl">
                    <Calendar size={36} className="mx-auto mb-3 text-[#1d1d1f]/15 dark:text-white/15" />
                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">No scheduled posts in the next 30 days.</p>
                </div>
            ) : posts.map(post => (
                <div key={post.id} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-[#1d1d1f] dark:text-white line-clamp-1">{post.content}</p>
                        <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">{new Date(post.scheduledAt).toLocaleString()} · {post.platforms.join(', ')}</p>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-[#f5f5f7] dark:bg-[#111] text-[10px] font-bold text-[#1d1d1f]/50 dark:text-white/50 capitalize">{post.status}</span>
                </div>
            ))}
        </div>
    );
};

export const AutomationsTab: React.FC<{ appId: string }> = ({ appId }) => {
    const socialHub = useSocialHub();
    const { getAutomations, publishAutomation, pauseAutomation } = useAutomation();
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        getAutomations(appId)
            .then(result => {
                if (!isMounted) return;
                const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
                setAutomations(data);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [appId, getAutomations]);

    const handleStatusChange = async (automation: Automation) => {
        const result = automation.status === 'active'
            ? await pauseAutomation(automation.id)
            : await publishAutomation(automation.id);
        const updated = result && 'data' in result ? result.data : result;
        if (updated) {
            setAutomations(prev => prev.map(item => item.id === automation.id ? updated as Automation : item));
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-8 text-center">
                <div className="w-16 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4"><Shield size={32} className="text-purple-500" /></div>
                <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">Automated Flows</h3>
                <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50 max-w-md mx-auto mb-6">Connect your social accounts to enable AI-powered manychat-style automations, many-to-one replies, and scheduled auto-posts.</p>
                <button onClick={socialHub.onOpenAutomationModal} className="px-6 py-2.5 bg-[#0071e3] text-white rounded-xl font-bold text-xs hover:bg-[#0077ed] active:scale-[0.98] transition-all">Initialize Automation Engine</button>
            </div>
            {loading ? (
                <div className="text-center py-8 text-sm text-[#1d1d1f]/50 dark:text-white/50">Loading automations...</div>
            ) : automations.length === 0 ? null : (
                <div className="space-y-3">
                    {automations.map(automation => (
                        <div key={automation.id} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{automation.name}</p>
                                <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">{automation.triggers.map(trigger => trigger.type).join(', ') || 'No triggers'}</p>
                            </div>
                            <button onClick={() => handleStatusChange(automation)} className="px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#111] text-xs font-bold text-[#1d1d1f]/70 dark:text-white/70 capitalize">
                                {automation.status === 'active' ? 'Pause' : 'Publish'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const AccountsTab: React.FC<{ connectedAccounts: SocialAccount[] }> = ({ connectedAccounts }) => {
    const socialHub = useSocialHub();
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">Connected Accounts</h3>
                <button onClick={socialHub.onOpenConnectModal} className="px-3 py-1.5 bg-[#0071e3] text-white rounded-lg font-bold text-xs hover:bg-[#0077ed] transition-all">+ Add Account</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {connectedAccounts.length === 0 ? (
                    <div className="sm:col-span-2 text-center py-12 bg-white dark:bg-[#1e1e20] border border-dashed border-[#1d1d1f]/12 dark:border-white/12 rounded-xl">
                        <Link2 size={32} className="mx-auto mb-3 text-[#1d1d1f]/15 dark:text-white/15" />
                        <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">No accounts connected yet</p>
                        <button onClick={socialHub.onOpenConnectModal} className="mt-3 px-5 py-2 bg-[#0071e3] text-white rounded-xl font-bold text-xs hover:bg-[#0077ed] transition-all">Connect Account</button>
                    </div>
                ) : connectedAccounts.map(account => {
                    const visual = platformVisual(account.platform);
                    const PlatformIcon = visual.icon;
                    return (
                        <div key={account.id} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${visual.gradient} flex items-center justify-center text-white shadow-sm`}>
                                <PlatformIcon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white capitalize">{account.platform}</p>
                                <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40 truncate">@{account.username || account.accountHandle || 'connected'}</p>
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const AnalyticsTab: React.FC = () => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
                { label: 'Reach', value: '0', change: '+0%', icon: Users },
                { label: 'Engagement', value: '0.0%', change: '+0%', icon: MessageSquare },
                { label: 'Conversion', value: '0.0%', change: '+0%', icon: TrendingUp },
            ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 flex items-center justify-center"><stat.icon size={16} className="text-[#0071e3]" /></div>
                        <span className="text-[10px] font-bold text-emerald-500">{stat.change}</span>
                    </div>
                    <p className="text-xl font-black text-[#1d1d1f] dark:text-white">{stat.value}</p>
                    <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">{stat.label}</p>
                </div>
            ))}
        </div>
        <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-12 text-center">
            <BarChart3 size={36} className="mx-auto mb-3 text-[#1d1d1f]/15 dark:text-white/15" />
            <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">Data will appear once your first campaign is active.</p>
        </div>
    </div>
);
