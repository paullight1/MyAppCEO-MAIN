import { useCallback } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiGetAuth } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export type UserAppRole = 'owner' | 'cofounder' | 'shareholder' | 'prospective' | 'watch_only';
export type UserAppSetupCompleteness = 'complete' | 'incomplete' | 'unknown';

export interface UserAppMembership {
  app_id: string;
  app_name: string;
  app_category: string;
  app_status: string;
  app_image_url: string;
  role: UserAppRole;
  equity_pct: number;
  shares_owned: number;
  joined_at: string;
  setup_complete?: boolean;
  setup_completeness?: UserAppSetupCompleteness;
  listing_id?: string;
  store_metadata?: Record<string, unknown>;
}

export interface UserAppsByRole {
  owned: UserAppMembership[];
  cofounded: UserAppMembership[];
  shareholder: UserAppMembership[];
  watchOnly: UserAppMembership[];
}

type LegacyAppsResponse = {
  owned?: UserAppMembership[];
  cofounded?: UserAppMembership[];
  shareholder?: UserAppMembership[];
  shareholders?: UserAppMembership[];
  watchOnly?: UserAppMembership[];
  watch_only?: UserAppMembership[];
  prospective?: UserAppMembership[];
};

const emptyApps = (): UserAppsByRole => ({
  owned: [],
  cofounded: [],
  shareholder: [],
  watchOnly: [],
});

const normalizeRole = (role?: string): UserAppRole => {
  if (role === 'co_founder') return 'cofounder';
  if (role === 'watch-only' || role === 'watch_only') return 'watch_only';
  if (role === 'owner' || role === 'cofounder' || role === 'shareholder' || role === 'prospective') return role;
  return 'watch_only';
};

export const normalizeUserApp = (app: Partial<UserAppMembership> & Record<string, any>, role?: UserAppRole): UserAppMembership => {
  const normalizedRole = role || normalizeRole(app.role);
  const appId = String(app.app_id || app.appId || app.id || '');
  const setupComplete = app.setup_complete ?? app.setupComplete;

  return {
    app_id: appId,
    app_name: String(app.app_name || app.appName || app.name || 'Untitled app'),
    app_category: String(app.app_category || app.appCategory || app.category || 'App'),
    app_status: String(app.app_status || app.appStatus || app.status || 'development'),
    app_image_url: String(app.app_image_url || app.appImageUrl || app.imageUrl || ''),
    role: normalizedRole,
    equity_pct: Number(app.equity_pct ?? app.equityPct ?? (normalizedRole === 'owner' ? 100 : 0)) || 0,
    shares_owned: Number(app.shares_owned ?? app.sharesOwned ?? 0) || 0,
    joined_at: String(app.joined_at || app.joinedAt || app.created_at || app.createdAt || new Date().toISOString()),
    setup_complete: typeof setupComplete === 'boolean' ? setupComplete : undefined,
    setup_completeness: typeof setupComplete === 'boolean' ? (setupComplete ? 'complete' : 'incomplete') : app.setup_completeness || 'unknown',
    listing_id: app.listing_id || app.listingId,
    store_metadata: app.store_metadata || app.storeMetadata,
  };
};

const unwrapResponse = <T>(response: ApiResponse<T> | T): T => {
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
};

export const flattenUserApps = (groups: UserAppsByRole): UserAppMembership[] => [
  ...groups.owned,
  ...groups.cofounded,
  ...groups.shareholder,
  ...groups.watchOnly,
];

export const groupUserAppsByRole = (apps: UserAppMembership[]): UserAppsByRole => apps.reduce((groups, app) => {
  if (app.role === 'owner') groups.owned.push(app);
  else if (app.role === 'cofounder') groups.cofounded.push(app);
  else if (app.role === 'shareholder') groups.shareholder.push(app);
  else groups.watchOnly.push({ ...app, role: app.role === 'prospective' ? 'prospective' : 'watch_only' });
  return groups;
}, emptyApps());

export interface UserAppFilters {
  role?: UserAppRole | 'all';
  status?: string;
  category?: string;
  setup?: UserAppSetupCompleteness | 'all';
}

export const useUserApps = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const getMyApps = useCallback(async () => run(async () => {
    const response = await apiGetAuth<ApiResponse<LegacyAppsResponse> | LegacyAppsResponse>('/apps/me');
    const data = unwrapResponse(response) || {};

    return {
      owned: (data.owned || []).map((app) => normalizeUserApp(app, 'owner')),
      cofounded: (data.cofounded || []).map((app) => normalizeUserApp(app, 'cofounder')),
      shareholder: (data.shareholder || data.shareholders || []).map((app) => normalizeUserApp(app, 'shareholder')),
      watchOnly: (data.watchOnly || data.watch_only || data.prospective || []).map((app) => normalizeUserApp(app)),
    } satisfies UserAppsByRole;
  }), [run]);

  return {
    getMyApps,
    isLoading,
    error,
  };
};
