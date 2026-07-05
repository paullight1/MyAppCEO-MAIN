import { ApiResponse } from '../types/api';
import { apiGetAuth, apiPost, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

/**
 * App Store Connect integration.
 *
 * Unlike the social platforms, App Store Connect does NOT use OAuth. It uses
 * the App Store Connect API, authenticated with a JWT that the backend signs
 * using a team API key: an Issuer ID, a Key ID, and a downloaded `.p8` private
 * key (EC P-256). We capture those credentials once, send them over TLS, and
 * the backend stores them encrypted — the private key is never returned to the
 * browser. That's why this connector is a credentials form, not a popup.
 *
 * Backend contract (NestJS, /api/v1):
 *   GET    /integrations/app-store/:appId        → ApiResponse<AppStoreConnection | null>
 *   POST   /integrations/app-store/connect       → ApiResponse<AppStoreConnection>
 *   POST   /integrations/app-store/:appId/sync    → ApiResponse<AppStoreConnection>
 *   DELETE /integrations/app-store/:appId         → ApiResponse<{ success: boolean }>
 */

export type AppStoreStatus = 'connected' | 'invalid' | 'expired';

export interface AppStoreConnection {
    id: string;
    appId: string;
    issuerId: string;
    /** Last 4 or full Key ID — safe to show; the private key is never returned. */
    keyId: string;
    vendorNumber?: string | null;
    /** Apple team/provider name, resolved server-side after a successful auth. */
    teamName?: string | null;
    status: AppStoreStatus;
    /** Number of apps available under this API key. */
    appCount?: number;
    lastSyncedAt?: string | null;
    connectedAt: string;
}

export interface AppStoreCredentials {
    /** Issuer ID (UUID) from Users and Access → Integrations → App Store Connect API. */
    issuerId: string;
    /** 10-character Key ID for the API key. */
    keyId: string;
    /** Full PEM contents of the downloaded AuthKey_XXXXXXXXXX.p8 file. */
    privateKey: string;
    /** Optional vendor number (for Sales & Finance reports). */
    vendorNumber?: string;
}

export const useAppStoreConnect = () => {
    // Default runner (returns the ApiResponse envelope or null) to match the
    // other connection hooks and ConnectionsPage's single-level `unwrap`.
    const { run, isLoading, error } = useApiRunner();

    /** Current connection for an app (null if none). */
    const getConnection = (appId: string) =>
        run(() =>
            apiGetAuth<ApiResponse<AppStoreConnection | null>>(`/integrations/app-store/${appId}`),
        );

    /** Validate credentials against Apple and store them encrypted. */
    const connect = (appId: string, credentials: AppStoreCredentials) =>
        run(() =>
            apiPost<ApiResponse<AppStoreConnection>>('/integrations/app-store/connect', {
                appId,
                issuerId: credentials.issuerId.trim(),
                keyId: credentials.keyId.trim(),
                privateKey: credentials.privateKey,
                vendorNumber: credentials.vendorNumber?.trim() || undefined,
            }),
        );

    /** Pull the latest metrics/app list from Apple for a connected app. */
    const sync = (appId: string) =>
        run(() =>
            apiPost<ApiResponse<AppStoreConnection>>(`/integrations/app-store/${appId}/sync`, {}),
        );

    /** Remove stored credentials for an app. */
    const disconnect = (appId: string) =>
        run(() =>
            apiDelete<ApiResponse<{ success: boolean }>>(`/integrations/app-store/${appId}`),
        );

    return { getConnection, connect, sync, disconnect, isLoading, error };
};
