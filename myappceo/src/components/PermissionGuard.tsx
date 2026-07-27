import React from 'react';

export const AccessDenied: React.FC<{ title?: string; message?: string }> = ({
  title = 'Access denied',
  message = 'You do not have permission to view this page.',
}) => (
  <div className="min-h-[80vh] flex items-center justify-center px-6">
    <div className="max-w-md rounded-[8px] border border-red-500/20 bg-red-50 p-6 text-center text-red-700 dark:bg-red-500/10 dark:text-red-300">
      <h1 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">{title}</h1>
      <p className="text-sm">{message}</p>
    </div>
  </div>
);

interface PermissionGuardProps {
  hasPermission: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Role-based rendering wrapper.
 * Shows children only if the user has the required permission.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  hasPermission,
  fallback = null,
  children,
}) => {
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

interface RoleGateProps {
  role: string;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only if the user's role is in the allowed list.
 */
export const RoleGate: React.FC<RoleGateProps> = ({
  role,
  allowedRoles,
  fallback = null,
  children,
}) => {
  if (!allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
