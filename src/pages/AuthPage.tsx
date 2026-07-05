import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { POST_AUTH_REDIRECT_KEY, useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui';

type AuthStatus = { type: 'error' | 'success'; text: string };

const getSafeRedirectPath = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    if (!value.startsWith('/') || value.startsWith('//')) return null;
    if (value.startsWith('/auth')) return null;
    return value;
};

export const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState<'ceo' | 'creator'>('ceo');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<AuthStatus | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, signUp, user, loading } = useAuth();

    const from = useMemo(() => {
        const statePath = location.state?.from
            ? `${location.state.from.pathname || ''}${location.state.from.search || ''}${location.state.from.hash || ''}`
            : null;
        const params = new URLSearchParams(location.search);
        return (
            getSafeRedirectPath(statePath) ||
            getSafeRedirectPath(params.get('redirectTo')) ||
            getSafeRedirectPath(typeof window !== 'undefined' ? sessionStorage.getItem(POST_AUTH_REDIRECT_KEY) : null) ||
            '/dashboard'
        );
    }, [location.search, location.state]);

    useEffect(() => {
        if (!loading && user) {
            sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
            navigate(from, { replace: true });
        }
    }, [from, loading, navigate, user]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setStatus(null);
        try {
            sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, from);
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth?redirectTo=${encodeURIComponent(from)}` },
            });
            if (oauthError) throw oauthError;
        } catch (err: unknown) {
            setStatus({ type: 'error', text: err instanceof Error ? err.message : 'Google sign-in failed.' });
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setStatus({ type: 'error', text: 'Please enter your email first, then click Forgot.' });
            return;
        }
        setIsLoading(true);
        setStatus(null);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth?reset=true`,
            });
            if (resetError) throw resetError;
            setStatus({ type: 'success', text: 'Password reset email sent! Check your inbox.' });
        } catch (err: unknown) {
            setStatus({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send reset email.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus(null);

        try {
            if (isLogin) {
                const { error: signInError } = await signIn(email, password);
                if (signInError) throw signInError;
                sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
                navigate(from, { replace: true });
            } else {
                if (!fullName) throw new Error('Please enter your full name');
                const { error: signUpError } = await signUp(email, password, {
                    full_name: fullName,
                    role: role
                });
                if (signUpError) throw signUpError;
                sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, from);
                setStatus({ type: 'success', text: 'Registration successful! Please check your email for verification.' });
            }
        } catch (err: unknown) {
            setStatus({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred during authentication.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6 transition-colors duration-300">
            <div className="w-full max-w-[440px]">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-3">
                        <div className="w-10 h-10 bg-foreground text-background rounded-[8px] flex items-center justify-center font-semibold text-xl transition-colors duration-300">
                            M
                        </div>
                        <span className="text-[21px] font-semibold text-foreground tracking-tight transition-colors duration-300">
                            MyAppCEO
                        </span>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-card rounded-[8px] shadow-[0_3px_30px_rgba(0,0,0,0.22)] overflow-hidden transition-colors duration-300">
                    {/* Role Switcher */}
                    {!isLogin && (
                        <div className="flex p-1 bg-muted border-b border-border transition-colors duration-300">
                            <button
                                type="button"
                                aria-pressed={role === 'ceo'}
                                onClick={() => setRole('ceo')}
                                className={`flex-1 py-3 rounded-[8px] text-[14px] font-normal transition-all ${role === 'ceo' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                CEO / Seller
                            </button>
                            <button
                                type="button"
                                aria-pressed={role === 'creator'}
                                onClick={() => setRole('creator')}
                                className={`flex-1 py-3 rounded-[8px] text-[14px] font-normal transition-all ${role === 'creator' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                App Creator
                            </button>
                        </div>
                    )}

                    <div className="p-8">
                        <div className="mb-8">
                            <h2 className="text-foreground text-[40px] font-semibold leading-[1.1] tracking-normal mb-2 transition-colors duration-300">
                                {isLogin ? 'Welcome Back.' : 'Create Account.'}
                            </h2>
                            <p className="text-muted-foreground text-[17px] leading-[1.47] tracking-[-0.374px] transition-colors duration-300">
                                {isLogin ? 'Access your dashboard and manage your assets.' : 'Join the ecosystem and list your first application.'}
                            </p>
                        </div>

                        {status && (
                            <div
                                role={status.type === 'error' ? 'alert' : 'status'}
                                className={`mb-6 p-4 rounded-[8px] flex items-start gap-3 text-[14px] ${status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}
                            >
                                {status.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                                <p>{status.text}</p>
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="space-y-6">
                            {!isLogin && (
                                <div>
                                    <label htmlFor="auth-fullname" className="text-[12px] text-muted-foreground uppercase tracking-wide mb-2 block transition-colors duration-300">Full Name</label>
                                    <input
                                        id="auth-fullname"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full bg-muted border-none rounded-[8px] py-3.5 px-4 text-[17px] focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="auth-email" className="text-[12px] text-muted-foreground uppercase tracking-wide mb-2 block transition-colors duration-300">Email Address</label>
                                <input
                                    id="auth-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full bg-muted border-none rounded-[8px] py-3.5 px-4 text-[17px] focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="auth-password" className="text-[12px] text-muted-foreground uppercase tracking-wide transition-colors duration-300">Password</label>
                                    {isLogin && (
                                        <button type="button" onClick={handleForgotPassword} className="text-[14px] text-primary hover:underline font-normal">
                                            Forgot?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        id="auth-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-muted border-none rounded-[8px] py-3.5 px-4 pr-12 text-[17px] focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                disabled={isLoading}
                                className="w-full h-auto py-4 rounded-full text-[17px] font-normal"
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>{isLogin ? 'Sign In' : 'Create Account'}</>
                                )}
                            </Button>
                        </form>

                        <div className="my-8 flex items-center gap-4">
                            <div className="h-px bg-border flex-1" />
                            <span className="text-[12px] text-muted-foreground uppercase tracking-wide">or continue with</span>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        {/* Google */}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isLoading}
                            onClick={handleGoogleSignIn}
                            className="w-full h-auto py-3.5 rounded-[8px] text-[17px] font-normal gap-3 text-foreground"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span>Google</span>
                        </Button>
                    </div>

                    <div className="p-6 bg-muted border-t border-border text-center transition-colors duration-300">
                        <p className="text-[14px] text-muted-foreground transition-colors duration-300">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-primary font-normal hover:underline"
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <div className="flex justify-center gap-8 text-[12px] text-muted-foreground uppercase tracking-wide transition-colors duration-300">
                        <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
