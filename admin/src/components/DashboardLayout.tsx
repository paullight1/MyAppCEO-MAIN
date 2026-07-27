import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useUserStatus } from '../hooks/useUserStatus';
import { AdminPermission, getIsAdminUser, getUserRole, hasAdminPermission } from '../utils/adminRoles';
import { NotificationDropdown } from './NotificationDropdown';
import { NotificationPopup } from './NotificationPopup';
import {
    LayoutDashboard,
    Store,
    LayoutGrid,
    Megaphone,
    Wallet,
    Plug,
    Settings,
    HelpCircle,
    Users,
    ClipboardList,
    History,
    Newspaper,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    Bell,
    Menu,
    X,
    LogOut,
    BarChart2,
    PieChart,
    BookOpen,
    Moon,
    Sun,
    Lightbulb,
    DollarSign,
    TrendingUp,
    Rocket,
    Target,
    FolderKanban,
    Scale,
    Percent
} from 'lucide-react';
import logoUrl from '../assets/logo.png';

interface NavItem {
    icon: React.ElementType;
    label: string;
    path: string;
    badge?: string;
    adminOnly?: boolean;
    adminPermission?: AdminPermission;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Overview',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
            { icon: BarChart2, label: 'Marketplace Oversight', path: '/marketplace' },
        ]
    },
    {
        title: 'Moderation',
        items: [
            { icon: ClipboardList, label: 'Review Queue', path: '/review', adminOnly: true, adminPermission: 'review_queue' },
            { icon: ShieldCheck, label: 'Verifications', path: '/verifications', adminOnly: true, adminPermission: 'identity_verification' },
        ]
    },
    {
        title: 'Content',
        items: [
            { icon: Newspaper, label: 'Blog', path: '/blog', adminOnly: true, adminPermission: 'content_management' },
            { icon: Bell, label: 'Notifications', path: '/notifications', adminOnly: true, adminPermission: 'notifications' },
        ]
    },
    {
        title: 'Compliance',
        items: [
            { icon: History, label: 'Audit Log', path: '/audit-log', adminOnly: true, adminPermission: 'audit_log' },
        ]
    }
];

const BOTTOM_NAV_ITEMS = [
    { icon: BookOpen, label: 'Documentation', path: '/documentation' },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isDark, toggleTheme } = useTheme();

    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { profile } = useUserStatus();
    const userMetadata = user?.user_metadata || {};
    const avatarUrl = (userMetadata.avatar_url || userMetadata.avatarUrl || userMetadata.picture) as string | undefined;
    const displayName = (userMetadata.full_name || userMetadata.name || user?.email?.split('@')[0] || 'User') as string;
    const userRole = getUserRole(user, profile?.role);
    const isAdmin = getIsAdminUser(user, profile?.role);

    const isActive = (path: string) => location.pathname === path;

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row transition-colors duration-300">
            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 dark:bg-white/10 backdrop-blur-sm z-[50] lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar (Desktop) / Drawer (Mobile) */}
            <aside
                className={`fixed lg:sticky left-0 top-0 h-screen bg-white dark:bg-[#111] border-r border-[#1d1d1f]/8 dark:border-white/8 flex flex-col transition-all duration-300 z-[60] 
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-72`}
            >
                {/* Logo & Close Button (Mobile) */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logoUrl} alt="Logo" className="w-9 h-9 object-cover rounded-xl shadow-lg" />
                        {(!collapsed || mobileMenuOpen) && (
                            <span className="text-lg font-bold tracking-tight text-foreground">
                                MY APP<span className="font-medium text-muted-foreground">CEO</span>
                            </span>
                        )}
                    </Link>
                    <button 
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto custom-scrollbar">
                    {NAV_SECTIONS.map((section) => {
                        const visibleItems = section.items.filter((item) => {
                            if (!item.adminOnly) return true;
                            if (!isAdmin) return false;
                            return item.adminPermission ? hasAdminPermission(user, profile?.role, item.adminPermission) : true;
                        });
                        if (visibleItems.length === 0) return null;

                        return (
                        <div key={section.title} className="mb-4">
                            {(!collapsed || mobileMenuOpen) && (
                                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                    {section.title}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                                                active
                                                    ? 'bg-[#e8f2ff] text-[#0f172a] font-semibold shadow-[inset_3px_0_0_#0071e3] dark:bg-[#0071e3]/15 dark:text-white'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            <Icon
                                                size={18}
                                                className={`flex-shrink-0 ${
                                                    active ? 'text-[#0071e3] dark:text-[#5aa9ff]' : 'text-muted-foreground group-hover:text-muted-foreground'
                                                }`}
                                            />
                                            {(!collapsed || mobileMenuOpen) && (
                                                <span className="text-sm">{item.label}</span>
                                            )}
                                            {(!collapsed || mobileMenuOpen) && item.badge && (
                                                <span className="ml-auto text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                    })}
                </nav>

                {/* Bottom Navigation */}
                <div className="px-3 py-3 border-t border-border space-y-1">
                    {BOTTOM_NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                    active ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                            >
                                <Icon size={20} className={`flex-shrink-0 ${active ? 'text-foreground' : 'text-muted-foreground'}`} />
                                {(!collapsed || mobileMenuOpen) && <span className="text-sm">{item.label}</span>}
                            </Link>
                        );
                    })}
                    
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-destructive hover:bg-destructive/10"
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        {(!collapsed || mobileMenuOpen) && <span className="text-sm">Sign Out</span>}
                    </button>
                </div>

                {/* Collapse Button (Desktop Only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Navigation */}
                <header className="sticky top-0 z-40 h-16 bg-card/80 backdrop-blur-lg border-b border-border/80">
                    <div className="h-full px-4 lg:px-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setMobileMenuOpen(true)}
                                className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
                                aria-label="Open navigation"
                            >
                                <Menu size={24} />
                            </button>
                            <Link
                                to="/dashboard"
                                className={`items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-muted/50 ${collapsed ? 'flex' : 'flex lg:hidden'}`}
                            >
                                <img src={logoUrl} alt="MyAppCEO" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
                                <span className="text-lg font-semibold tracking-normal text-foreground">MyAppCEO</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-4">
                            <button 
                                onClick={toggleTheme}
                                className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
                                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <NotificationDropdown />
                            
                            <div className="h-8 w-px bg-border mx-1" />
                            
                            <div className="flex items-center gap-2 p-1.5 rounded-xl">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="w-8 h-8 rounded-xl object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                        {displayName[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-semibold text-foreground">{displayName}</p>
                                    <p className="text-[10px] text-muted-foreground -mt-0.5 uppercase font-bold tracking-tighter">
                                        {userRole?.replace(/_/g, ' ') || 'CEO'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-8">{children}</main>

            </div>

            {/* In-App Notification Popup (shows after login) */}
            {user && <NotificationPopup userId={user.id} />}
        </div>
    );
};
