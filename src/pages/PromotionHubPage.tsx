import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Megaphone,
    DollarSign,
    TrendingUp,
    Users,
    ChevronRight,
    Search,
    Loader2,
    Pause,
    Play,
    Wallet,
    Zap,
    BarChart3,
    Target,
    Eye,
    ArrowUpRight,
    AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCampaigns, Campaign, CampaignStatus } from '../hooks/useCampaigns';
import { usePromotionBudget, RuleStatus, CreateRulePayload, CreateBudgetPayload } from '../hooks/usePromotionBudget';
import { RuleCard } from '../components/RuleCard';
import { CreateRuleModal } from '../components/CreateRuleModal';
import { BudgetConfigModal } from '../components/BudgetConfigModal';
import { AnimatedIcon, GroupHoverIcon } from '../components/ui/AnimatedIcon';
import { getStatusStyle } from '../utils/statusStyles';
import { useAuth } from '../hooks/useAuth';

type TabType = 'overview' | 'campaigns' | 'budget' | 'analytics';

export const PromotionHubPage: React.FC = () => {
    const { user } = useAuth();
    const appId = user?.defaultAppId || '';

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const navigate = useNavigate();

    const { getCampaignsByApp, updateCampaignStatus } = useCampaigns();
    const {
        budget,
        rules,
        transactions,
        fetchBudget,
        fetchRules,
        fetchTransactions,
        createRule,
        updateBudget,
        updateRuleStatus,
        deleteRule,
        isLoading: budgetLoading,
        error: promotionError,
    } = usePromotionBudget();

    useEffect(() => {
        loadCampaigns();
    }, [appId]);

    useEffect(() => {
        fetchBudget();
        fetchRules();
        fetchTransactions();
    }, [fetchBudget, fetchRules, fetchTransactions]);

    const loadCampaigns = async () => {
        setIsLoading(true);
        try {
            if (appId) {
                const response = await getCampaignsByApp(appId);
                setCampaigns(response?.data || []);
            } else {
                setCampaigns([]);
            }
        } catch (error) {
            console.error('Failed to load campaigns', error);
            setCampaigns([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePauseCampaign = async (id: string) => {
        await updateCampaignStatus(id, 'paused');
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'paused' } : c));
    };

    const handleResumeCampaign = async (id: string) => {
        await updateCampaignStatus(id, 'active');
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c));
    };

    const handleCreateRule = async (payload: CreateRulePayload) => {
        await createRule(payload);
        setShowCreateRuleModal(false);
    };

    const handleUpdateBudget = async (payload: CreateBudgetPayload) => {
        await updateBudget(payload);
        setShowBudgetModal(false);
    };

    const openCampaign = (id: string) => navigate(`/campaigns/${id}`);

    const handleToggleRule = async (id: string, status: RuleStatus) => {
        await updateRuleStatus(id, status);
    };

    const handleDeleteRule = async (id: string) => {
        if (confirm('Are you sure you want to delete this rule?')) {
            await deleteRule(id);
        }
    };

    const filteredCampaigns = useMemo(() => {
        let result = [...campaigns];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c => c.name.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query));
        }
        if (statusFilter !== 'all') {
            result = result.filter(c => c.status === statusFilter);
        }
        return result;
    }, [campaigns, searchQuery, statusFilter]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: campaigns.length };
        campaigns.forEach(c => {
            counts[c.status] = (counts[c.status] || 0) + 1;
        });
        return counts;
    }, [campaigns]);
    const statsCards = useMemo(() => {
        const totalSpent = campaigns.reduce((sum, campaign) => sum + Number(campaign.budget || 0), 0);
        const activeCampaignCount = campaigns.filter(campaign => campaign.status === 'active').length;
        return [
            { label: 'Budget Planned', value: `$${totalSpent.toLocaleString()}`, change: campaigns.length ? `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}` : 'No campaigns', icon: DollarSign, color: 'from-blue-500 to-indigo-600' },
            { label: 'Active Campaigns', value: activeCampaignCount, change: `${campaigns.length} total`, icon: Megaphone, color: 'from-emerald-500 to-teal-600' },
            { label: 'Connected Tools', value: rules.length, change: 'Auto-rules', icon: Eye, color: 'from-violet-500 to-purple-600' },
            { label: 'Avg ROI', value: '-', change: 'Connect analytics', icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
        ];
    }, [campaigns, rules.length]);

    const promotionUnavailable = Boolean(promotionError);
    const canManagePromotion = Boolean(budget) && !promotionUnavailable;
    const budgetUsagePct = budget && budget.monthlyLimit > 0
        ? Math.min(100, (budget.currentSpend / budget.monthlyLimit) * 100)
        : 0;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                                <AnimatedIcon icon={Megaphone} size={20} className="text-white" animation="wiggle" trigger="loop" />
                            </span>
                            Promotion Hub
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1">Manage your campaigns, budget, and creator partnerships</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/promote/creators')}
                            className="group px-5 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center gap-2 active:scale-[0.98]"
                        >
                            <AnimatedIcon icon={Users} size={18} animation="pulse" /> Find Creators
                        </button>
                        <button onClick={() => navigate('/campaigns/new')} className="group px-5 py-2.5 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ed] transition-colors flex items-center gap-2 active:scale-[0.98]">
                            <AnimatedIcon icon={Plus} size={18} animation="pop" /> New Campaign
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
                        { id: 'budget', label: 'Budget', icon: Wallet },
                        { id: 'analytics', label: 'Analytics', icon: TrendingUp, link: '/promote/analytics' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => tab.link ? navigate(tab.link) : setActiveTab(tab.id as TabType)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === tab.id
                                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>

                {promotionError && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                        <AlertCircle size={20} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold">Promotion budget tools are unavailable</p>
                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/90">
                                Budget, automation rules, and transaction controls are disabled until the promotion API endpoints return live data.
                            </p>
                        </div>
                    </div>
                )}

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {statsCards.map((stat, i) => {
                                const Icon = stat.icon;
                                return (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`p-6 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                                <Icon size={20} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <div className="mt-2 flex items-center gap-1 text-white/80 text-xs font-medium">
                                            <ArrowUpRight size={12} />
                                            {stat.change}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Active Campaigns */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-foreground">Your Campaigns</h3>
                                    <button
                                        onClick={() => setActiveTab('campaigns')}
                                        className="text-sm font-medium text-accent hover:underline"
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {campaigns.length === 0 ? (
                                        <div className="rounded-2xl bg-card border border-border p-8 text-center">
                                            <Megaphone size={36} className="mx-auto text-muted-foreground/30" />
                                            <p className="mt-3 text-sm font-bold text-foreground">No promotion campaigns yet</p>
                                            <p className="mt-1 text-xs text-muted-foreground">Create a campaign or connect tools like Meta Ads, TikTok Ads, Google Ads, Firebase, AppsFlyer, or Adjust to populate performance data.</p>
                                            <button onClick={() => navigate('/campaigns/new')} className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">New Campaign</button>
                                        </div>
                                    ) : campaigns.slice(0, 3).map((campaign, i) => {
                                        const status = getStatusStyle(campaign.status);
                                        return (
                                        <motion.button
                                            key={campaign.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            onClick={() => openCampaign(campaign.id)}
                                            className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-[#0071e3]/30 hover:shadow-md transition-all group active:scale-[0.99]"
                                            aria-label={`View ${campaign.name}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center">
                                                        <Megaphone size={20} className="text-[#0071e3]" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground">{campaign.name}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            ${campaign.budget?.toLocaleString()} budget
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.badge}`}>
                                                        {status.label}
                                                    </span>
                                                    <GroupHoverIcon icon={ChevronRight} size={20} animation="translate-x" className="text-muted-foreground" />
                                                </div>
                                            </div>
                                        </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Wallet & Quick Actions */}
                            <div className="space-y-4">
                                {/* Wallet Card */}
                                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-6 rounded-2xl text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-white/80">Promotion Wallet</h4>
                                        <Wallet size={18} className="text-white/60" />
                                    </div>
                                    <p className="text-3xl font-bold">{budget ? `$${budget.monthlyLimit.toLocaleString()}` : '-'}</p>
                                    <p className="text-sm text-white/60 mt-1">{budget ? 'Monthly promotion limit' : 'Promotion budget not configured'}</p>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => setShowBudgetModal(true)}
                                            disabled={promotionUnavailable}
                                            className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors disabled:text-white/50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                                        >
                                            {budget ? 'Manage Budget' : 'Add Funds'}
                                        </button>
                                        <button
                                            onClick={() => canManagePromotion ? setShowCreateRuleModal(true) : setActiveTab('budget')}
                                            disabled={promotionUnavailable}
                                            className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors disabled:text-white/50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                                        >
                                            Auto-Promote
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Links */}
                                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                                    <h4 className="font-bold text-foreground">Quick Actions</h4>
                                    <button
                                        onClick={() => navigate('/promote/creators')}
                                        className="group w-full p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Users size={18} className="text-[#0071e3]" />
                                            <span className="text-sm font-medium">Browse Creators</span>
                                        </span>
                                        <GroupHoverIcon icon={ChevronRight} size={18} animation="translate-x" className="text-muted-foreground" />
                                    </button>
                                    <button onClick={() => navigate('/promote/analytics')} className="group w-full p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between">
                                        <span className="flex items-center gap-3">
                                            <Target size={18} className="text-[#0071e3]" />
                                            <span className="text-sm font-medium">View Analytics</span>
                                        </span>
                                        <GroupHoverIcon icon={ChevronRight} size={18} animation="translate-x" className="text-muted-foreground" />
                                    </button>
                                    <button onClick={() => navigate('/connections#services')} className="group w-full p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between">
                                        <span className="flex items-center gap-3">
                                            <Zap size={18} className="text-[#0071e3]" />
                                            <span className="text-sm font-medium">Connect Social Tools</span>
                                        </span>
                                        <GroupHoverIcon icon={ChevronRight} size={18} animation="translate-x" className="text-muted-foreground" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Campaigns Tab */}
                {activeTab === 'campaigns' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search campaigns..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                                />
                            </div>
                            <div className="flex gap-2">
                                {['all', 'active', 'paused', 'draft', 'completed'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === status
                                                ? 'bg-[#0071e3] text-white'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                        aria-pressed={statusFilter === status}
                                    >
                                        {status === 'all' ? 'All' : getStatusStyle(status).label}
                                        {statusCounts[status] > 0 && (
                                            <span className="ml-1.5 opacity-70">({statusCounts[status]})</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Campaigns List */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                            </div>
                        ) : filteredCampaigns.length === 0 ? (
                            <div className="text-center py-20">
                                <Megaphone size={48} className="mx-auto text-muted-foreground/30" />
                                <p className="mt-4 text-muted-foreground font-medium">No campaigns found</p>
                                <button onClick={() => navigate('/campaigns/new')} className="mt-4 px-5 py-2.5 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                                    Create Your First Campaign
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredCampaigns.map((campaign, i) => {
                                    const status = getStatusStyle(campaign.status);
                                    return (
                                    <motion.div
                                        key={campaign.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="bg-card border border-border rounded-2xl p-5 hover:border-[#0071e3]/30 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center">
                                                    <Megaphone size={24} className="text-[#0071e3]" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-foreground">{campaign.name}</h4>
                                                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.badge}`}>
                                                            {status.label}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            ${campaign.budget?.toLocaleString()} budget
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {campaign.status === 'active' && (
                                                    <button
                                                        onClick={() => handlePauseCampaign(campaign.id)}
                                                        className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                                                        aria-label={`Pause ${campaign.name}`}
                                                    >
                                                        <Pause size={18} />
                                                    </button>
                                                )}
                                                {campaign.status === 'paused' && (
                                                    <button
                                                        onClick={() => handleResumeCampaign(campaign.id)}
                                                        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                        aria-label={`Resume ${campaign.name}`}
                                                    >
                                                        <Play size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openCampaign(campaign.id)}
                                                    className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-[#0071e3]/10 hover:text-[#0071e3] transition-colors"
                                                    aria-label={`View ${campaign.name} details`}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Budget Tab */}
                {activeTab === 'budget' && (
                    <div className="space-y-8">
                        {/* Budget Overview Card */}
                        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 rounded-[40px] text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0071e3]/20 rounded-full blur-3xl -mr-20 -mt-20" />
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                                        <AnimatedIcon icon={Zap} size={12} className="text-[#4da3ff]" animation="wiggle" trigger="loop" />
                                        {canManagePromotion ? 'Auto-Promotion Ready' : 'Set a Budget to Begin'}
                                    </div>
                                    <h2 className="text-4xl font-bold leading-tight">Set Your Promotion Budget</h2>
                                    <p className="text-slate-400 text-lg leading-relaxed">
                                        {budget
                                            ? `You've allocated $${budget.monthlyLimit.toLocaleString()} per month. Adjust your limit or add auto-promotion rules to spend it intelligently.`
                                            : 'Set a monthly limit so auto-promotion rules can hire creators and boost campaigns automatically — within a cap you control.'}
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={() => setShowBudgetModal(true)}
                                            disabled={promotionUnavailable}
                                            className="group px-8 py-4 rounded-2xl bg-[#0071e3] text-white font-bold transition-all flex items-center gap-2 hover:bg-[#0077ed] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                                        >
                                            <AnimatedIcon icon={Wallet} size={18} animation="float" /> {budget ? 'Manage Budget' : 'Configure Budget'}
                                        </button>
                                        <button
                                            onClick={() => setShowCreateRuleModal(true)}
                                            disabled={!canManagePromotion}
                                            className="group px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:text-white/40 disabled:hover:bg-white/5 hover:bg-white/10"
                                        >
                                            <AnimatedIcon icon={Plus} size={18} animation="pop" /> Add Auto-Rule
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-400 text-sm font-medium">Monthly Limit</span>
                                            <Wallet size={18} className="text-white/60" />
                                        </div>
                                        <p className="text-3xl font-bold">{budget ? `$${budget.monthlyLimit.toLocaleString()}` : '-'}</p>
                                        <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#0071e3] to-indigo-500 rounded-full transition-all"
                                                style={{ width: `${budgetUsagePct}%` }}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-slate-400">
                                            {budget ? `$${budget.currentSpend.toLocaleString()} spent of $${budget.monthlyLimit.toLocaleString()}` : 'No live budget data'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Active Rules', value: rules.filter(r => r.status === 'active').length.toString() },
                                            { label: 'This Month', value: budget ? `$${budget.currentSpend.toLocaleString()}` : '-' },
                                        ].map((s, i) => (
                                            <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                                                <p className="text-xl font-bold text-white">{s.value}</p>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Auto-Promotion Rules Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <AnimatedIcon icon={Zap} size={20} className="text-[#0071e3]" animation="wiggle" trigger="loop" />
                                    Auto-Promotion Rules
                                </h3>
                                <button
                                    onClick={() => setShowCreateRuleModal(true)}
                                    disabled={!canManagePromotion}
                                    className="group px-4 py-2 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ed] transition-colors flex items-center gap-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <AnimatedIcon icon={Plus} size={16} animation="pop" /> Add Rule
                                </button>
                            </div>

                            {rules.length === 0 ? (
                                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                                    <Zap size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground font-medium mb-4">No auto-promotion rules yet</p>
                                    {promotionUnavailable && (
                                        <p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">
                                            The promotion rules API is unavailable, so rules cannot be configured yet.
                                        </p>
                                    )}
                                    <button
                                        onClick={() => setShowCreateRuleModal(true)}
                                        disabled={!canManagePromotion}
                                        className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Create Your First Rule
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {rules.map((rule) => (
                                        <RuleCard
                                            key={rule.id}
                                            rule={rule}
                                            onToggle={handleToggleRule}
                                            onDelete={handleDeleteRule}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Transaction History */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-border">
                                <h3 className="text-lg font-bold text-foreground">Recent Transactions</h3>
                            </div>
                            <div className="divide-y divide-border">
                                {transactions.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-muted-foreground">No transactions yet</p>
                                    </div>
                                ) : (
                                    transactions.map((tx, i) => (
                                        <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                            <div>
                                                <p className="font-medium text-foreground">{tx.description}</p>
                                                <p className="text-sm text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-foreground">${Math.abs(tx.amount)}</p>
                                                <span className="text-xs text-muted-foreground">{tx.status}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Rule Modal */}
                <CreateRuleModal
                    isOpen={showCreateRuleModal}
                    onClose={() => setShowCreateRuleModal(false)}
                    onSubmit={handleCreateRule}
                    isLoading={budgetLoading}
                />

                {/* Budget Config Modal */}
                <BudgetConfigModal
                    isOpen={showBudgetModal}
                    onClose={() => setShowBudgetModal(false)}
                    onSubmit={handleUpdateBudget}
                    isLoading={budgetLoading}
                    initial={budget}
                />
            </div>
        </DashboardLayout>
    );
};
