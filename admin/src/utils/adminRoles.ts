import type { User } from '@supabase/supabase-js';

export const ADMIN_ROLES = [
  'admin',
  'super_admin',
  'moderator',
  'finance',
  'analyst',
  'support_agent',
  'finance_operator',
  'content_reviewer',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminPermission =
  | 'review_queue'
  | 'notifications'
  | 'audit_log'
  | 'content_management'
  | 'identity_verification';

const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES);
const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  admin: ['review_queue', 'notifications', 'audit_log', 'content_management', 'identity_verification'],
  super_admin: ['review_queue', 'notifications', 'audit_log', 'content_management', 'identity_verification'],
  moderator: ['review_queue'],
  finance: ['audit_log'],
  analyst: ['review_queue', 'audit_log'],
  support_agent: ['notifications', 'audit_log', 'identity_verification'],
  finance_operator: ['audit_log'],
  content_reviewer: ['review_queue', 'content_management'],
};

export const normalizeRole = (role: unknown): string | null => {
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized || null;
};

export const isAdminRole = (role: unknown): role is AdminRole => {
  const normalized = normalizeRole(role);
  return Boolean(normalized && ADMIN_ROLE_SET.has(normalized));
};

export const getUserRole = (user: User | null | undefined, profileRole?: unknown): string | null => {
  const metadata = user?.app_metadata || {};
  return (
    normalizeRole(profileRole) ||
    normalizeRole(metadata.role) ||
    normalizeRole(metadata.app_role) ||
    normalizeRole(metadata.account_role) ||
    null
  );
};

export const getIsAdminUser = (user: User | null | undefined, profileRole?: unknown): boolean =>
  isAdminRole(getUserRole(user, profileRole));

export const hasAdminPermission = (
  user: User | null | undefined,
  profileRole: unknown,
  permission: AdminPermission,
): boolean => {
  const role = getUserRole(user, profileRole);
  return isAdminRole(role) && ADMIN_ROLE_PERMISSIONS[role].includes(permission);
};

export const getAdminPermissionForPath = (pathname: string): AdminPermission | null => {
  if (pathname === '/admin/review') return 'review_queue';
  if (pathname === '/admin/notifications') return 'notifications';
  if (pathname === '/admin/blog' || pathname.startsWith('/admin/blog/')) return 'content_management';
  if (pathname === '/admin/verifications') return 'identity_verification';
  if (pathname === '/audit-log') return 'audit_log';
  if (pathname.startsWith('/admin/')) return 'review_queue';
  return null;
};
