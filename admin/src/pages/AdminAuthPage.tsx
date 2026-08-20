import React, { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import logoUrl from '../assets/logo.png';

type AuthLocationState = {
  from?: string;
};

export const AdminAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const returnTo = ((location.state as AuthLocationState | null)?.from || '/');

  if (!loading && user) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setSubmitting(true);
    setMessage(null);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setMessage('Sign-in failed. Check your credentials and try again.');
      return;
    }

    navigate(returnTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logoUrl} alt="MyAppCEO" className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-sm" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Restricted staff workspace
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Admin sign in</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use your authorized MyAppCEO staff account. Access is checked again against your server-backed role after sign-in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <label className="block text-sm font-semibold text-foreground" htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            required
          />

          <label className="mt-5 block text-sm font-semibold text-foreground" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            required
          />

          {message && (
            <div role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || submitting || !email.trim() || !password}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading || submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
            {submitting ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>
      </div>
    </div>
  );
};
