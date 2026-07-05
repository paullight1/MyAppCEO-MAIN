import { describe, expect, it, vi } from 'vitest';
import {
  flattenUserApps,
  groupUserAppsByRole,
  normalizeUserApp,
  type UserAppMembership,
} from '../src/hooks/useUserApps';

vi.mock('../src/lib/apiClient', () => ({
  apiGetAuth: vi.fn(),
}));

vi.mock('../src/hooks/useApiRunner', () => ({
  useApiRunner: () => ({
    run: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

describe('user app workspace helpers', () => {
  it('normalizes legacy app fields into the canonical membership shape', () => {
    const app = normalizeUserApp({
      id: 42,
      appName: 'Launch OS',
      appCategory: 'SaaS',
      appStatus: 'live',
      appImageUrl: 'https://example.com/app.png',
      role: 'co_founder',
      equityPct: '12.5',
      sharesOwned: '1500',
      createdAt: '2026-05-01T10:00:00.000Z',
      setupComplete: false,
      listingId: 'listing-1',
      storeMetadata: { platform: 'ios' },
    });

    expect(app).toEqual({
      app_id: '42',
      app_name: 'Launch OS',
      app_category: 'SaaS',
      app_status: 'live',
      app_image_url: 'https://example.com/app.png',
      role: 'cofounder',
      equity_pct: 12.5,
      shares_owned: 1500,
      joined_at: '2026-05-01T10:00:00.000Z',
      setup_complete: false,
      setup_completeness: 'incomplete',
      listing_id: 'listing-1',
      store_metadata: { platform: 'ios' },
    });
  });

  it('defaults unknown roles to watch-only and owner equity to 100 percent', () => {
    const unknownRoleApp = normalizeUserApp({ app_id: 'app-1', role: 'viewer' });
    const ownerApp = normalizeUserApp({ app_id: 'app-2' }, 'owner');

    expect(unknownRoleApp.role).toBe('watch_only');
    expect(unknownRoleApp.setup_completeness).toBe('unknown');
    expect(ownerApp.role).toBe('owner');
    expect(ownerApp.equity_pct).toBe(100);
  });

  it('groups canonical memberships by workspace role', () => {
    const apps = [
      normalizeUserApp({ app_id: 'owned', role: 'owner' }),
      normalizeUserApp({ app_id: 'cofounder', role: 'cofounder' }),
      normalizeUserApp({ app_id: 'shareholder', role: 'shareholder' }),
      normalizeUserApp({ app_id: 'prospective', role: 'prospective' }),
      normalizeUserApp({ app_id: 'watch', role: 'watch-only' }),
    ];

    const groups = groupUserAppsByRole(apps);

    expect(groups.owned.map((app) => app.app_id)).toEqual(['owned']);
    expect(groups.cofounded.map((app) => app.app_id)).toEqual(['cofounder']);
    expect(groups.shareholder.map((app) => app.app_id)).toEqual(['shareholder']);
    expect(groups.watchOnly.map((app) => [app.app_id, app.role])).toEqual([
      ['prospective', 'prospective'],
      ['watch', 'watch_only'],
    ]);
  });

  it('flattens role groups in dashboard display order', () => {
    const membership = (app_id: string, role: UserAppMembership['role']): UserAppMembership =>
      normalizeUserApp({ app_id, role });

    expect(flattenUserApps({
      owned: [membership('owned', 'owner')],
      cofounded: [membership('cofounder', 'cofounder')],
      shareholder: [membership('shareholder', 'shareholder')],
      watchOnly: [membership('watch', 'watch_only')],
    }).map((app) => app.app_id)).toEqual(['owned', 'cofounder', 'shareholder', 'watch']);
  });
});

describe('platform foundation flow coverage gaps', () => {
  it.todo('verifies signed-out app workspace routes persist the post-auth redirect and navigate to /auth');
  it.todo('verifies successful app creation/import only routes to /apps/:id/dashboard after persistence succeeds');
  it.todo('verifies owner, cofounder, shareholder, prospective, admin, and support route gates');
  it.todo('verifies brand-new accounts and apps without data render dashboard empty states instead of demo metrics');
});
