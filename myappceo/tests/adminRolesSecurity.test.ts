import { describe, expect, it } from 'vitest';
import * as webRoles from '../src/utils/adminRoles';
import * as adminRoles from '../../admin/src/utils/adminRoles';

const MODULES = [webRoles, adminRoles] as const;

const userWithRole = (role: string) => ({ app_metadata: { role } }) as any;

const expectPermission = (
  role: string,
  permission: webRoles.AdminPermission,
  expected: boolean,
) => {
  for (const roles of MODULES) {
    expect(
      roles.hasAdminPermission(userWithRole(role), null, permission),
      `${role} -> ${permission}`,
    ).toBe(expected);
  }
};

describe('admin UI permissions mirror backend authorization', () => {
  it('reserves audit logs for super_admin', () => {
    expectPermission('super_admin', 'audit_log', true);
    for (const role of [
      'admin',
      'moderator',
      'analyst',
      'support_agent',
      'finance',
      'finance_operator',
      'content_reviewer',
    ]) {
      expectPermission(role, 'audit_log', false);
    }
  });

  it('allows the moderation queue only for server-authorized reviewer roles', () => {
    for (const role of ['super_admin', 'moderator', 'content_reviewer']) {
      expectPermission(role, 'review_queue', true);
    }
    for (const role of ['admin', 'analyst', 'support_agent', 'finance', 'finance_operator']) {
      expectPermission(role, 'review_queue', false);
    }
  });

  it('allows admin notifications only for server-authorized notification roles', () => {
    for (const role of ['super_admin', 'moderator', 'support_agent']) {
      expectPermission(role, 'notifications', true);
    }
    for (const role of ['admin', 'analyst', 'finance', 'finance_operator', 'content_reviewer']) {
      expectPermission(role, 'notifications', false);
    }
  });

  it('keeps RLS-backed blog and KYC capabilities scoped to their current reviewers', () => {
    expectPermission('admin', 'content_management', true);
    expectPermission('super_admin', 'content_management', true);
    expectPermission('content_reviewer', 'content_management', true);
    expectPermission('moderator', 'content_management', false);

    expectPermission('admin', 'identity_verification', true);
    expectPermission('super_admin', 'identity_verification', true);
    expectPermission('support_agent', 'identity_verification', true);
    expectPermission('moderator', 'identity_verification', false);
  });

  it('maps standalone admin routes to the same permission categories as linked web routes', () => {
    const expected: Array<[string, webRoles.AdminPermission | null]> = [
      ['/review', 'review_queue'],
      ['/admin/review', 'review_queue'],
      ['/notifications', 'notifications'],
      ['/admin/notifications', 'notifications'],
      ['/blog', 'content_management'],
      ['/admin/blog', 'content_management'],
      ['/verifications', 'identity_verification'],
      ['/admin/verifications', 'identity_verification'],
      ['/audit-log', 'audit_log'],
      ['/marketplace', null],
      ['/documentation', null],
    ];

    for (const roles of MODULES) {
      for (const [path, permission] of expected) {
        expect(roles.getAdminPermissionForPath(path), path).toBe(permission);
      }
    }
  });

  it('fails closed for unauthenticated, non-admin, and under-privileged direct routes', () => {
    for (const roles of MODULES) {
      expect(roles.resolveAdminRouteAccess(null, null, '/review')).toBe('sign_in');
      expect(roles.resolveAdminRouteAccess(userWithRole('ceo'), null, '/')).toBe('forbidden');
      expect(roles.resolveAdminRouteAccess(userWithRole('admin'), null, '/')).toBe('allow');
      expect(roles.resolveAdminRouteAccess(userWithRole('admin'), null, '/review')).toBe('forbidden');
      expect(roles.resolveAdminRouteAccess(userWithRole('admin'), null, '/blog')).toBe('allow');
      expect(roles.resolveAdminRouteAccess(userWithRole('moderator'), null, '/review')).toBe('allow');
      expect(roles.resolveAdminRouteAccess(userWithRole('moderator'), null, '/notifications')).toBe('allow');
      expect(roles.resolveAdminRouteAccess(userWithRole('moderator'), null, '/audit-log')).toBe('forbidden');
      expect(roles.resolveAdminRouteAccess(userWithRole('super_admin'), null, '/audit-log')).toBe('allow');
    }
  });

  it('keeps the customer and standalone-admin permission implementations in parity', () => {
    for (const role of webRoles.ADMIN_ROLES) {
      for (const permission of [
        'review_queue',
        'notifications',
        'audit_log',
        'content_management',
        'identity_verification',
      ] as const) {
        expect(
          webRoles.hasAdminPermission(userWithRole(role), null, permission),
        ).toBe(adminRoles.hasAdminPermission(userWithRole(role), null, permission));
      }
    }
  });
});
