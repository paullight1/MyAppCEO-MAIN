import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAppRole, AppRole } from '../hooks/useAppRole';
import { POST_AUTH_REDIRECT_KEY, useAuth } from '../hooks/useAuth';
import { useUserStatus } from '../hooks/useUserStatus';
import { getAdminPermissionForPath, hasAdminPermission } from '../utils/adminRoles';
import { AccessDenied } from './PermissionGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

type AppRouteRequirement = {
  permission?: string;
  roles?: AppRole['role'][];
};

const LoadingGate = () => (
  <div className="min-h-[80vh] flex items-center justify-center">
    <div className="w-12 h-12 border-[3px] border-[#2d2d3a] border-t-[#6366f1] rounded-full animate-spin" />
  </div>
);

const getAppRouteRequirement = (pathname: string): AppRouteRequirement | null => {
  if (!pathname.startsWith('/apps/')) return null;
  if (pathname.endsWith('/dashboard')) return { permission: 'view_analytics' };
  if (pathname.endsWith('/team')) return { permission: 'manage_team' };
  if (pathname.endsWith('/cap-table')) return { permission: 'view_cap_table' };
  if (pathname.endsWith('/legal')) return { permission: 'view_legal_agreements' };
  if (pathname.endsWith('/equity')) return { permission: 'change_equity_splits' };
  if (pathname.includes('/phases/')) return { roles: ['owner', 'cofounder'] };
  if (pathname.endsWith('/deployments/new')) return { roles: ['owner', 'cofounder'] };
  return null;
};

const hasRoutePermission = (appRole: AppRole, requirement: AppRouteRequirement): boolean => {
  if (appRole.status !== 'active') return false;
  if (appRole.role === 'admin') return true;
  if (appRole.role === 'prospective') return false;
  if (requirement.roles && !requirement.roles.includes(appRole.role)) return false;
  if (requirement.permission && !appRole.permissions[requirement.permission]) return false;
  return true;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { getRole } = useAppRole();
  const { profile, isAdmin, isDeleted, isSuspended, isLoading: statusLoading } = useUserStatus();
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const fullPath = `${location.pathname}${location.search}${location.hash}`;
  const adminPermission = getAdminPermissionForPath(location.pathname);
  const isAdminRoute = Boolean(adminPermission);
  const appRequirement = useMemo(() => getAppRouteRequirement(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, fullPath);
    }
  }, [fullPath, loading, user]);

  useEffect(() => {
    let isMounted = true;

    const loadAppRole = async () => {
      if (!user || !id || !appRequirement) {
        setAppRole(null);
        return;
      }

      setPermissionLoading(true);
      setPermissionError(null);
      const result = await getRole(id);

      if (!isMounted) return;
      if (result.success && result.data) {
        setAppRole(result.data);
      } else {
        setAppRole(null);
        setPermissionError(result.error || 'Unable to verify app access.');
      }
      setPermissionLoading(false);
    };

    loadAppRole();

    return () => {
      isMounted = false;
    };
  }, [appRequirement, getRole, id, user]);

  if (loading) return <LoadingGate />;

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (statusLoading) return <LoadingGate />;

  if (isDeleted) {
    return <AccessDenied title="Account unavailable" message="This account has been deleted." />;
  }

  if (isSuspended) {
    return <AccessDenied title="Account suspended" message="Your account is suspended. Contact support if this looks wrong." />;
  }

  if (isAdminRoute && (!profile || !isAdmin || !adminPermission || !hasAdminPermission(user, profile.role, adminPermission))) {
    return <AccessDenied title="Admin access required" message="This page is only available to administrators." />;
  }

  if (appRequirement) {
    if (permissionLoading) return <LoadingGate />;
    if (permissionError) {
      return <AccessDenied title="Unable to verify access" message={permissionError} />;
    }
    if (!appRole || !hasRoutePermission(appRole, appRequirement)) {
      return <AccessDenied message="You do not have an active role with permission to view this app workspace page." />;
    }
  }

  return <>{children}</>;
};
