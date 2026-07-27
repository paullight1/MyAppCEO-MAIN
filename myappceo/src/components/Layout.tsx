import React, { useState } from 'react';
import { UserCircle, Bell, Menu, X, LogOut, Moon, Sun, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import logoUrl from '../assets/logo.png';

const NAV_LINKS = [
    { label: 'Explore', to: '/marketplace' },
    { label: 'Sell', to: '/listings/new' },
    { label: 'Invest', to: '/invest' },
    { label: 'Community', to: '/community' },
    { label: 'Blog', to: '/blog' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    const isActive = (to: string) => location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`));

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const handleProtectedLink = (e: React.MouseEvent, to: string) => {
        if (!user && (to === '/listings/new')) {
            e.preventDefault();
            navigate('/auth', { state: { from: { pathname: to } } });
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-black transition-colors duration-300">
            {/* Apple-style Nav - True Liquid Glass */}
            <nav className="sticky top-0 z-50 bg-[rgba(10,10,10,0.72)] dark:bg-[rgba(10,10,10,0.72)] backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
                <div className="max-w-[1024px] mx-auto px-8">
                    <div className="h-[44px] flex items-center justify-between">
                        {/* Logo - Left */}
                        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                            <img src={logoUrl} alt="MyAppCEO" className="w-[28px] h-[28px] object-cover rounded-[4px] group-hover:opacity-80 transition-opacity" />
                            <span className="text-[13px] font-normal text-white tracking-tight hidden sm:block">
                                MyAppCEO
                            </span>
                        </Link>

                        {/* Center Nav Links */}
                        <div className="hidden lg:flex items-center justify-center gap-[32px] flex-1">
                            {NAV_LINKS.map(({ label, to }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    onClick={(e) => handleProtectedLink(e, to)}
                                    className={`text-[12px] font-normal transition-all ${isActive(to)
                                        ? 'text-white'
                                        : 'text-white/70 hover:text-white'
                                    }`}
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>

                        {/* Right - Actions */}
                        <div className="flex items-center gap-[18px] shrink-0">
                            {/* Search */}
                            <Link to="/marketplace" className="text-white/80 hover:text-white transition-colors p-1 hidden sm:block">
                                <Search size={16} />
                            </Link>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="text-white/80 hover:text-white transition-colors p-1"
                                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                            </button>

                            {/* Notifications */}
                            <button className="relative text-white/80 hover:text-white transition-colors p-1 hidden sm:block">
                                <Bell size={16} />
                                <span className="absolute top-0 right-0 w-[4px] h-[4px] bg-[#0071e3] rounded-full" />
                            </button>

                            {/* Auth */}
                            {user ? (
                                <div className="flex items-center gap-[12px]">
                                    <Link
                                        to="/escrow"
                                        className={`hidden sm:inline text-[12px] font-normal transition-colors ${isActive('/escrow') ? 'text-white' : 'text-white/80 hover:text-white'}`}
                                    >
                                        Deals
                                    </Link>
                                    <Link
                                        to="/dashboard"
                                        className="flex items-center gap-2 text-[12px] font-normal text-white/80 hover:text-white transition-colors"
                                    >
                                        <UserCircle size={16} />
                                        <span className="hidden sm:inline">Dashboard</span>
                                    </Link>
                                    <button
                                        onClick={handleSignOut}
                                        className="text-white/60 hover:text-white transition-colors p-1"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/auth"
                                    className="px-[12px] py-[6px] bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white text-[12px] font-normal rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                >
                                    Sign In
                                </Link>
                            )}

                            {/* Mobile Menu Toggle */}
                            <button
                                className="lg:hidden text-white/80 hover:text-white transition-colors p-1"
                                onClick={() => setMobileOpen(v => !v)}
                            >
                                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Drawer */}
                    {mobileOpen && (
                        <div className="lg:hidden bg-[rgba(0,0,0,0.95)] backdrop-blur-[20px] px-8 py-6 border-t border-white/[0.1] space-y-6">
                            {/* Mobile Search - navigates to marketplace */}
                            <Link to="/marketplace" onClick={() => setMobileOpen(false)} className="block">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={16} />
                                    <div
                                        className="w-full bg-white/[0.1] border-none rounded-full py-3 pl-12 pr-4 text-[14px] text-white/50 placeholder:text-white/50 cursor-pointer"
                                    >
                                        Search apps...
                                    </div>
                                </div>
                            </Link>

                            {/* Mobile Nav Links */}
                            <div className="space-y-4">
                                {user && (
                                    <>
                                        <Link
                                            to="/dashboard"
                                            onClick={() => setMobileOpen(false)}
                                            className="block text-[14px] font-normal py-2 text-white"
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            to="/escrow"
                                            onClick={() => setMobileOpen(false)}
                                            className="block text-[14px] font-normal py-2 text-white/70 hover:text-white transition-all"
                                        >
                                            Deals & Escrow
                                        </Link>
                                    </>
                                )}
                                {NAV_LINKS.map(({ label, to }) => (
                                    <Link
                                        key={to}
                                        to={to}
                                        onClick={() => setMobileOpen(false)}
                                        className={`block text-[14px] font-normal py-2 transition-all ${isActive(to)
                                            ? 'text-white'
                                            : 'text-white/70 hover:text-white'
                                        }`}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>

                            {/* Mobile Auth */}
                            {user && (
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-2 text-[14px] font-normal text-white/70 hover:text-white transition-all py-2"
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer - Light */}
            <footer className="bg-[#f5f5f7] dark:bg-[#1d1d1f] py-16 px-8 border-t border-[#1d1d1f]/[0.08] dark:border-white/[0.08] transition-colors duration-300">
                <div className="max-w-[980px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        {/* Brand Column */}
                        <div className="space-y-4">
                            <Link to="/" className="flex items-center gap-2.5">
                                <img src={logoUrl} alt="MyAppCEO" className="w-[28px] h-[28px] object-cover rounded-[4px]" />
                                <span className="text-[17px] font-normal text-[#1d1d1f] dark:text-white tracking-tight transition-colors duration-300">
                                    MyAppCEO
                                </span>
                            </Link>
                            <p className="text-[14px] text-[#1d1d1f]/60 dark:text-white/60 leading-[1.47] tracking-[-0.374px] max-w-[250px] transition-colors duration-300">
                                Buy, sell, and invest in digital assets with confidence.
                            </p>
                        </div>

                        {/* Products */}
                        <div className="space-y-6">
                            <h4 className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide font-normal transition-colors duration-300">Products</h4>
                            <div className="space-y-4">
                                <Link to="/marketplace" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Marketplace</Link>
                                <Link to="/invest" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Investment Pools</Link>
                                <Link to="/escrow" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Escrow & Deals</Link>
                                <Link to="/community" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Community</Link>
                            </div>
                        </div>

                        {/* Resources */}
                        <div className="space-y-6">
                            <h4 className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide font-normal transition-colors duration-300">Resources</h4>
                            <div className="space-y-4">
                                <Link to="/developers" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Developers</Link>
                                <Link to="/docs" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Documentation</Link>
                                <Link to="/blog" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Blog</Link>
                                <Link to="/support" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Support</Link>
                            </div>
                        </div>

                        {/* Legal */}
                        <div className="space-y-6">
                            <h4 className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 uppercase tracking-wide font-normal transition-colors duration-300">Legal</h4>
                            <div className="space-y-4">
                                <Link to="/terms" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Terms of Service</Link>
                                <Link to="/privacy" className="text-[14px] text-[#1d1d1f]/80 dark:text-white/80 hover:text-[#1d1d1f] dark:hover:text-white transition-colors block">Privacy Policy</Link>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-[#1d1d1f]/[0.08] dark:border-white/[0.08] transition-colors duration-300">
                        <p className="text-[12px] text-[#1d1d1f]/48 dark:text-white/48 font-normal transition-colors duration-300">
                            Copyright 2026 MyAppCEO. All rights reserved.
                        </p>
                        <div className="flex items-center gap-[24px] text-[12px] text-[#1d1d1f]/48 dark:text-white/48 transition-colors duration-300">
                            <a href="https://twitter.com/mvplab" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] dark:hover:text-white transition-colors">Twitter</a>
                            <a href="https://linkedin.com/company/mvplab" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] dark:hover:text-white transition-colors">LinkedIn</a>
                            <a href="https://github.com/mvplab" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] dark:hover:text-white transition-colors">GitHub</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
