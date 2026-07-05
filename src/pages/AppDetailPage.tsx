import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, TrendingUp, Users, DollarSign, Zap, Megaphone,
    Settings, Sparkles, CheckCircle2, AlertCircle, ChevronRight,
    BarChart3, Activity, Package, ExternalLink, ShieldCheck,
    UsersRound, FileText, Crown, Briefcase, Loader2, Clock,
    Plus, Search, CheckCircle, XCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { useAppRole, AppRole } from '../hooks/useAppRole';
import { useShareholderSystem, ShareholderOffer } from '../hooks/useShareholderSystem';
import { useAppDocuments } from '../hooks/useAppDocuments';
import { QuickActionRow, QuickActionCard } from '../components/QuickActionCards';
import { RoleBadge } from '../components/RoleBadge';
import { PermissionGuard, RoleGate } from '../components/PermissionGuard';
import { MembersPanel } from '../components/MembersPanel';
import { DocumentManager } from '../components/DocumentManager';
import { ShareholderApplicationForm } from '../components/ShareholderApplicationForm';
import { CreateShareholderOffer } from '../components/CreateShareholderOffer';

// Mock analytics for now (replace with real API later)
const MOCK_ANALYTICS = [
    { day: 'Mon', revenue: 420, dau: 1200 },
    { day: 'Tue', revenue: 580, dau: 1350 },
    { day: 'Wed', revenue: 350, dau: 980 },
    { day: 'Thu', revenue: 720, dau: 1600 },
    { day: 'Fri', revenue: 890, dau: 1900 },
    { day: 'Sat', revenue: 650, dau: 1400 },
    { day: 'Sun', revenue: 480, dau: 1100 },
];

type ViewType = 'overview' | 'analytics' | 'members' | 'documents' | 'shares' | 'settings';

export const AppDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getRole, getMembers } = useAppRole();
    const { getOffers, submitRequest, getRequests, approveRequest, rejectRequest } = useShareholderSystem();
    const { getDocuments } = useAppDocuments();

    const [activeView, setActiveView] = useState<ViewType>('overview');
    const [appRole, setAppRole] = useState<AppRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [docCount, setDocCount] = useState(0);
    const [offers, setOffers] = useState<ShareholderOffer[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [activeOffer, setActiveOffer] = useState<ShareholderOffer | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showCreateOffer, setShowCreateOffer] = useState(false);

    // Real app data from Supabase
    const [appData, setAppData] = useState<{
        id: string;
        name: string;
        status: string;
        category: string;
        description: string;
        monthlyRevenue: number;
        askingPrice: number;
        equityAvailable: number | null;
        revenueVerified: boolean;
        imageUrl: string;
    } | null>(null);

    useEffect(() => {
        if (id) loadAppData();
    }, [id]);

    const loadAppData = async () => {
        if (!id) return;
        setLoading(true);
        setNotFound(false);
        try {
            // Fetch listing data from Supabase
            const { data: listing, error: listingError } = await supabase
                .from('listings')
                .select('*')
                .eq('id', id)
                .single();

            if (listingError || !listing) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            setAppData({
                id: listing.id,
                name: listing.name,
                status: listing.status,
                category: listing.category,
                description: listing.short_description || listing.long_description || '',
                monthlyRevenue: listing.monthly_revenue || 0,
                askingPrice: listing.asking_price || 0,
                equityAvailable: listing.equity_available,
                revenueVerified: listing.revenue_verified,
                imageUrl: listing.image_url,
            });

            // Fetch membership, documents, offers, requests
            const [roleResult, membersResult, docsResult, offersResult, requestsResult] = await Promise.all([
                getRole(id),
                getMembers(id),
                getDocuments(id),
                getOffers(id),
                getRequests(id),
            ]);

            if (roleResult.success && roleResult.data) setAppRole(roleResult.data);
            if (membersResult.success && membersResult.data) setMemberCount(membersResult.data.length);
            if (docsResult.success && docsResult.data) setDocCount(docsResult.data.length);
            if (offersResult.success && offersResult.data) setOffers(offersResult.data);
            if (requestsResult.success && requestsResult.data) setRequests(requestsResult.data);
        } catch (err) {
            console.error('Failed to load app data:', err);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyForShares = (offer: ShareholderOffer) => {
        setActiveOffer(offer);
        setShowApplicationForm(true);
    };

    const handleApproveRequest = async (requestId: string) => {
        if (!confirm('Approve this shareholder application?')) return;
        setActionLoading(requestId);
        try {
            await approveRequest(requestId);
            loadAppData();
        } catch (err: any) {
            console.error('Failed to approve request:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        if (!confirm('Reject this shareholder application?')) return;
        setActionLoading(requestId);
        try {
            await rejectRequest(requestId);
            loadAppData();
        } catch (err: any) {
            console.error('Failed to reject request:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const currentRole = appRole?.role || 'prospective';

    // Quick action cards based on role
    const quickActions = [
        { icon: 'analytics', label: 'Analytics', onClick: () => setActiveView('analytics'), disabled: !appRole?.canAccess('analytics') },
        { icon: 'members', label: 'Members', count: memberCount, onClick: () => setActiveView('members'), disabled: !appRole?.canAccess('view_analytics') && currentRole === 'prospective' },
        { icon: 'documents', label: 'Documents', count: docCount, onClick: () => setActiveView('documents'), disabled: !appRole?.permissions?.view_documents },
        { icon: 'shares', label: 'Shares', onClick: () => setActiveView('shares'), hidden: currentRole === 'owner' || currentRole === 'cofounder' },
        { icon: 'captable', label: 'Cap Table', onClick: () => setActiveView('overview'), disabled: !appRole?.permissions?.view_cap_table, hidden: currentRole === 'shareholder' || currentRole === 'prospective' },
        { icon: 'settings', label: 'Settings', onClick: () => setActiveView('settings'), disabled: !appRole?.permissions?.manage_team, hidden: currentRole === 'shareholder' || currentRole === 'prospective' },
    ];

    if (loading) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 size={32} className="text-[#0071e3] animate-spin" />
                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">Loading app details...</p>
                </div>
            </Layout>
        );
    }

    if (notFound || !appData) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <AlertCircle size={48} className="text-red-500" />
                    <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white">App Not Found</h2>
                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">This app may have been removed or does not exist.</p>
                    <button
                        onClick={() => navigate('/marketplace')}
                        className="px-5 py-2.5 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all mt-2"
                    >
                        Browse Marketplace
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors duration-300">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

                    {/* Back Button + Header */}
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white dark:hover:bg-[#1e1e20] border border-transparent hover:border-[#1d1d1f]/8 dark:hover:border-white/8 transition-all">
                            <ArrowLeft size={18} className="text-[#1d1d1f]/50 dark:text-white/50" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-black text-[#1d1d1f] dark:text-white truncate">{appData.name}</h1>
                                <RoleBadge role={currentRole} size="md" />
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold border border-emerald-500/20">
                                    {appData.status}
                                </span>
                            </div>
                            <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50 mt-0.5">{appData.category} • {appData.description?.slice(0, 80)}...</p>
                        </div>
                    </div>

                    {/* Quick Action Cards */}
                    <QuickActionRow cards={quickActions} />

                    {/* Main Content Area */}
                    <AnimatePresence mode="wait">
                        {activeView === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                                {/* Stats Row */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Monthly Revenue', value: appData.monthlyRevenue ? `$${appData.monthlyRevenue.toLocaleString()}` : '—', change: appData.revenueVerified ? 'Verified' : '', icon: DollarSign, color: 'text-emerald-500' },
                                        { label: 'Asking Price', value: appData.askingPrice ? `$${appData.askingPrice.toLocaleString()}` : '—', change: '', icon: TrendingUp, color: 'text-blue-500' },
                                        { label: 'Status', value: appData.status.charAt(0).toUpperCase() + appData.status.slice(1), change: '', icon: ShieldCheck, color: 'text-purple-500' },
                                        { label: 'Equity Available', value: appData.equityAvailable ? `${appData.equityAvailable}%` : '—', change: '', icon: Crown, color: 'text-amber-500' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <stat.icon size={16} className={stat.color} />
                                                {stat.change && <span className="text-[10px] font-bold text-emerald-500">{stat.change}</span>}
                                            </div>
                                            <p className="text-lg font-black text-[#1d1d1f] dark:text-white">{stat.value}</p>
                                            <p className="text-[10px] text-[#1d1d1f]/40 dark:text-white/40">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Analytics Chart (if role permits) */}
                                <PermissionGuard hasPermission={appRole?.canAccess('analytics') || false}>
                                    <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-4 flex items-center gap-2">
                                            <BarChart3 size={16} className="text-[#0071e3]" /> Revenue Trend
                                        </h3>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <AreaChart data={MOCK_ANALYTICS}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                                <Area type="monotone" dataKey="revenue" stroke="#0071e3" fill="#0071e3" fillOpacity={0.1} strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </PermissionGuard>

                                {/* Members Preview */}
                                <PermissionGuard hasPermission={currentRole !== 'prospective'}>
                                    <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                                <UsersRound size={16} className="text-[#0071e3]" /> Team
                                            </h3>
                                            <button onClick={() => setActiveView('members')} className="text-xs font-bold text-[#0071e3] hover:underline">
                                                View All <ChevronRight size={12} className="inline" />
                                            </button>
                                        </div>
                                        <MembersPanel appId={id || ''} />
                                    </div>
                                </PermissionGuard>

                                {/* Documents Preview */}
                                <PermissionGuard hasPermission={appRole?.permissions?.view_documents || false}>
                                    <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                                <FileText size={16} className="text-[#0071e3]" /> Documents
                                            </h3>
                                            <button onClick={() => setActiveView('documents')} className="text-xs font-bold text-[#0071e3] hover:underline">
                                                View All <ChevronRight size={12} className="inline" />
                                            </button>
                                        </div>
                                        <DocumentManager appId={id || ''} canUpload={appRole?.permissions?.upload_documents || false} />
                                    </div>
                                </PermissionGuard>

                    {/* Shareholder Requests (for owners) */}
                    <RoleGate role={currentRole} allowedRoles={['owner']}>
                        <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-4 flex items-center gap-2">
                                <Briefcase size={16} className="text-amber-500" />
                                Shareholder Applications ({requests.filter(r => r.status === 'pending').length} pending)
                            </h3>
                            {requests.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users size={32} className="mx-auto mb-2 text-[#1d1d1f]/15 dark:text-white/15" />
                                    <p className="text-sm text-[#1d1d1f]/40 dark:text-white/40">No applications yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {requests.filter(r => r.status === 'pending').map((req: any) => (
                                        <div key={req.id} className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl border border-[#1d1d1f]/8 dark:border-white/8">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs">
                                                        {req.user_profile?.full_name?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{req.user_profile?.full_name || 'Unknown User'}</p>
                                                        <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">{req.shares_requested} shares</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-bold border border-amber-500/20">
                                                    ${req.total_investment?.toLocaleString() || 'TBD'}
                                                </span>
                                            </div>
                                            {req.message && (
                                                <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50 mb-3 p-2 bg-white dark:bg-[#1e1e20] rounded-lg border border-[#1d1d1f]/5 dark:border-white/5">
                                                    "{req.message}"
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApproveRequest(req.id)}
                                                    disabled={actionLoading === req.id}
                                                    className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                >
                                                    {actionLoading === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(req.id)}
                                                    disabled={actionLoading === req.id}
                                                    className="flex-1 py-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg font-bold text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                >
                                                    {actionLoading === req.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {requests.filter(r => r.status !== 'pending').length > 0 && (
                                        <p className="text-xs text-[#1d1d1f]/30 dark:text-white/30 text-center pt-2">
                                            {requests.filter(r => r.status !== 'pending').length} resolved applications
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </RoleGate>

                    {/* Shareholder Offers (for prospective users) */}
                    <RoleGate role={currentRole} allowedRoles={['prospective']}>
                        <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-4 flex items-center gap-2">
                                <DollarSign size={16} className="text-[#0071e3]" /> Investment Opportunities
                            </h3>
                            {offers.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Briefcase size={32} className="mx-auto mb-2 text-[#1d1d1f]/15 dark:text-white/15" />
                                                <p className="text-sm text-[#1d1d1f]/40 dark:text-white/40">No active offers</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {offers.map(offer => (
                                                    <div key={offer.id} className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl border border-[#1d1d1f]/8 dark:border-white/8">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div>
                                                                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">${offer.price_per_share} / share</p>
                                                                <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">
                                                                    Min: {offer.min_shares} shares • Max: {offer.max_shares || 'Unlimited'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleApplyForShares(offer)}
                                                                className="px-4 py-2 bg-[#0071e3] text-white rounded-lg font-bold text-xs hover:bg-[#0077ed] transition-all flex items-center gap-1.5"
                                                            >
                                                                <Plus size={14} /> Apply
                                                            </button>
                                                        </div>
                                                        {offer.conditions && (
                                                            <p className="text-xs text-[#1d1d1f]/50 dark:text-white/50">{offer.conditions}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </RoleGate>
                            </motion.div>
                        )}

                        {activeView === 'members' && (
                            <motion.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <button onClick={() => setActiveView('overview')} className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors">
                                        <ArrowLeft size={16} className="text-[#1d1d1f]/50 dark:text-white/50" />
                                    </button>
                                    <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">All Members</h3>
                                </div>
                                <MembersPanel appId={id || ''} />
                            </motion.div>
                        )}

                        {activeView === 'documents' && (
                            <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <button onClick={() => setActiveView('overview')} className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors">
                                        <ArrowLeft size={16} className="text-[#1d1d1f]/50 dark:text-white/50" />
                                    </button>
                                    <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">All Documents</h3>
                                </div>
                                <DocumentManager appId={id || ''} canUpload={appRole?.permissions?.upload_documents || false} />
                            </motion.div>
                        )}

                        {activeView === 'analytics' && (
                            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                                <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                            <BarChart3 size={16} className="text-[#0071e3]" /> Revenue Trend
                                        </h3>
                                        <button onClick={() => setActiveView('overview')} className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors">
                                            <ArrowLeft size={16} className="text-[#1d1d1f]/50 dark:text-white/50" />
                                        </button>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={MOCK_ANALYTICS}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                            <Area type="monotone" dataKey="revenue" stroke="#0071e3" fill="#0071e3" fillOpacity={0.1} strokeWidth={2} />
                                            <Area type="monotone" dataKey="dau" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-4 flex items-center gap-2">
                                            <Activity size={16} className="text-[#0071e3]" /> Key Metrics
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Monthly Revenue', value: appData.monthlyRevenue ? `$${appData.monthlyRevenue.toLocaleString()}` : '—' },
                                                { label: 'Active Users', value: MOCK_ANALYTICS[MOCK_ANALYTICS.length - 1]?.dau.toLocaleString() || '—' },
                                                { label: 'Growth Rate', value: '—' },
                                                { label: 'Valuation', value: appData.askingPrice ? `$${appData.askingPrice.toLocaleString()}` : '—' },
                                            ].map((metric, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm text-[#1d1d1f]/50 dark:text-white/50">{metric.label}</span>
                                                    <span className="text-sm font-bold text-[#1d1d1f] dark:text-white">{metric.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-4 flex items-center gap-2">
                                            <Package size={16} className="text-[#0071e3]" /> App Info
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">Category</p>
                                                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{appData.category}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">Equity Available</p>
                                                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">{appData.equityAvailable ? `${appData.equityAvailable}%` : 'Not set'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">Revenue Verified</p>
                                                <p className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                                                    {appData.revenueVerified ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
                                                    {appData.revenueVerified ? 'Yes' : 'No'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeView === 'shares' && (
                            <motion.div key="shares" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <button onClick={() => setActiveView('overview')} className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors">
                                        <ArrowLeft size={16} className="text-[#1d1d1f]/50 dark:text-white/50" />
                                    </button>
                                    <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                        <DollarSign size={16} className="text-[#0071e3]" /> Investment Opportunities
                                    </h3>
                                </div>
                                {offers.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Briefcase size={32} className="mx-auto mb-2 text-[#1d1d1f]/15 dark:text-white/15" />
                                        <p className="text-sm text-[#1d1d1f]/40 dark:text-white/40">No active offers</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {offers.map(offer => (
                                            <div key={offer.id} className="p-5 bg-[#fafafa] dark:bg-[#111] rounded-xl border border-[#1d1d1f]/8 dark:border-white/8">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="text-lg font-black text-[#1d1d1f] dark:text-white">${offer.price_per_share} / share</p>
                                                        <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40 mt-1">
                                                            Min: {offer.min_shares} shares • Max: {offer.max_shares || 'Unlimited'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleApplyForShares(offer)}
                                                        className="px-5 py-2.5 bg-[#0071e3] text-white rounded-xl font-bold text-sm hover:bg-[#0077ed] transition-all flex items-center gap-2"
                                                    >
                                                        <Plus size={16} /> Apply Now
                                                    </button>
                                                </div>
                                                {offer.conditions && (
                                                    <p className="text-sm text-[#1d1d1f]/60 dark:text-white/60 mt-3 p-3 bg-white dark:bg-[#1e1e20] rounded-lg border border-[#1d1d1f]/5 dark:border-white/5">
                                                        {offer.conditions}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeView === 'settings' && (
                            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                <RoleGate role={currentRole} allowedRoles={['owner', 'cofounder']} fallback={
                                    <div className="text-center py-12 bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl">
                                        <ShieldCheck size={32} className="mx-auto mb-2 text-[#1d1d1f]/15 dark:text-white/15" />
                                        <p className="text-sm text-[#1d1d1f]/40 dark:text-white/40">You don't have permission to access settings</p>
                                    </div>
                                }>
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <button onClick={() => setActiveView('overview')} className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#111] transition-colors">
                                                    <ArrowLeft size={16} className="text-[#1d1d1f]/50 dark:text-white/50" />
                                                </button>
                                                <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white">App Settings</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl">
                                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-1">App Name</p>
                                                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">{appData.name}</p>
                                                </div>
                                                <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl">
                                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-1">Category</p>
                                                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">{appData.category}</p>
                                                </div>
                                                <div className="p-4 bg-[#fafafa] dark:bg-[#111] rounded-xl">
                                                    <p className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-1">Status</p>
                                                    <p className="text-sm text-[#1d1d1f]/50 dark:text-white/50">{appData.status}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shareholder Offers (Owner only) */}
                                        {currentRole === 'owner' && (
                                            <div className="bg-white dark:bg-[#1e1e20] border border-[#1d1d1f]/8 dark:border-white/8 rounded-xl p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                                        <DollarSign size={16} className="text-[#0071e3]" />
                                                        Shareholder Offers ({offers.length})
                                                    </h3>
                                                    <button
                                                        onClick={() => setShowCreateOffer(true)}
                                                        className="px-3 py-1.5 bg-[#0071e3] text-white rounded-lg font-bold text-xs hover:bg-[#0077ed] transition-all flex items-center gap-1.5"
                                                    >
                                                        <Plus size={14} /> New Offer
                                                    </button>
                                                </div>
                                                {offers.length === 0 ? (
                                                    <div className="text-center py-6">
                                                        <p className="text-sm text-[#1d1d1f]/40 dark:text-white/40">No active offers</p>
                                                        <button
                                                            onClick={() => setShowCreateOffer(true)}
                                                            className="mt-2 text-xs font-bold text-[#0071e3] hover:underline"
                                                        >
                                                            Create your first offer
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {offers.map(offer => (
                                                            <div key={offer.id} className="p-3 bg-[#fafafa] dark:bg-[#111] rounded-lg border border-[#1d1d1f]/5 dark:border-white/5">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">${offer.price_per_share} / share</p>
                                                                        <p className="text-xs text-[#1d1d1f]/40 dark:text-white/40">
                                                                            Min: {offer.min_shares} • Max: {offer.max_shares || 'Unlimited'}
                                                                        </p>
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${offer.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'}`}>
                                                                        {offer.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {currentRole === 'owner' && (
                                            <button className="w-full py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-colors">
                                                Delete App
                                            </button>
                                        )}
                                    </div>
                                </RoleGate>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Shareholder Application Modal */}
            {showApplicationForm && activeOffer && (
                <ShareholderApplicationForm
                    appId={id || ''}
                    offer={activeOffer}
                    onSuccess={() => setShowApplicationForm(false)}
                    onClose={() => { setShowApplicationForm(false); setActiveOffer(null); }}
                />
            )}

            {/* Create Shareholder Offer Modal */}
            {showCreateOffer && (
                <CreateShareholderOffer
                    appId={id || ''}
                    onSuccess={() => { loadAppData(); }}
                    onClose={() => setShowCreateOffer(false)}
                />
            )}
        </Layout>
    );
};

// Helper to build a prospective role when no membership exists
function buildProspectiveRole() {
    return {
        role: 'prospective' as const,
        permissions: {
            view_analytics: false,
            view_cap_table: false,
            manage_team: false,
            upload_documents: false,
            view_documents: false,
            create_shareholder_offer: false,
            apply_as_shareholder: true,
            manage_finances: false,
            delete_app: false,
            change_equity_splits: false,
            post_updates: false,
            view_legal_agreements: false,
            vote_on_decisions: false,
            export_data: false,
        },
        canAccess: (feature: string) => false,
        canEdit: (feature: string) => false,
        canDelete: (feature: string) => false,
    };
}
