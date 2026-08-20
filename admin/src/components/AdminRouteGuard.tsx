import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserStatus } from '../hooks/useUserStatus';
import { getUserRole, resolveAdminRouteAccess } from '../utils/adminRoles';

export const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
    isSuspended,
    isDeleted,
  } = useUserStatus();

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Checking admin access…
        </div>
      </div>
    );
  }

  const access = resolveAdminRouteAccess(user, profile?.role, location.pathname);
  if (access === 'sign_in') {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  const accountBlocked = isSuspended || isDeleted;
  const accessDenied = access === 'forbidden' || accountBlocked || Boolean(profileError);

  if (accessDenied) {
    const role = getUserRole(user, profile?.role);
    const detail = profileError
      ? 'We could not verify your staff profile. Access is blocked until the authorization check succeeds.'
      : accountBlocked
        ? 'This account is not permitted to use the admin workspace.'
        : `Your ${role?.replace(/_/g, ' ') || 'current'} role is not authorized for this admin route.`;

    const handleSignOut = async () => {
      await signOut();
      navigate('/auth', { replace: true });
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            {profileError ? <ShieldAlert className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Admin access denied</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Admin home
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
