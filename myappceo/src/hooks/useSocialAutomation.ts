import { ApiResponse } from '../../../packages/types/src';
import { apiGetAuth, apiPost, apiPatch, apiDelete } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationRuleStatus = 'active' | 'paused';
export type SocialPlatform = 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'youtube' | 'meta';
export type OAuthPlatform = 'meta' | 'tiktok' | 'twitter';

export interface SocialAccount {
  id: string;
  appId: string;
  platform: SocialPlatform;
  accountHandle: string;
  username?: string;
  avatarUrl?: string;
  scopes?: string[];
  status?: 'active' | 'expired' | 'reauth_required' | 'disconnected';
  tokenExpiresAt?: string | null;
  permissions?: string[];
  connectedAt: string;
}

export interface AutomationRule {
  id: string;
  appId: string;
  trigger: string;      // e.g. keyword that triggers a reply
  action: string;       // e.g. DM template or comment reply
  platform: SocialPlatform;
  status: AutomationRuleStatus;
  createdAt: string;
}

export interface ConnectAccountPayload {
  platform: SocialPlatform;
  accountHandle: string;
  accessToken?: string;
}

export interface CreateRulePayload {
  platform: SocialPlatform;
  trigger: string;
  action: string;
}

export interface HireTalentPayload {
  appId: string;
  proposal: string;
  budget: number;
  campaignId?: string;
}

export interface HireRequest {
  id: string;
  ceoId: string;
  talentId: string;
  appId: string;
  proposal: string;
  budget: number;
  campaignId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useSocialAutomation = () => {
  const { run, isLoading, error } = useApiRunner();

  // ── Social Account Management ─────────────────────────────────────────────

  /**
   * Connect a social media account to an app.
   * Maps to POST /social-automation/accounts/:appId
   */
  const connectAccount = (appId: string, payload: ConnectAccountPayload) =>
    run(() =>
      apiPost<ApiResponse<SocialAccount>>(`/social-automation/accounts/${appId}`, payload),
    );

  /**
   * List all connected social accounts for an app.
   * Maps to GET /social-automation/accounts/:appId
   */
  const getAccounts = (appId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<SocialAccount[]>>(`/social-automation/accounts/${appId}`),
    );

  // ── Automation Rules ─────────────────────────────────────────────────────

  /**
   * Create a new keyword-based automation rule (ManyChat-style).
   * Maps to POST /social-automation/rules/:appId
   */
  const createRule = (appId: string, payload: CreateRulePayload) =>
    run(() =>
      apiPost<ApiResponse<AutomationRule>>(`/social-automation/rules/${appId}`, payload),
    );

  /**
   * List all automation rules for an app.
   * Maps to GET /social-automation/rules/:appId
   */
  const getRules = (appId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<AutomationRule[]>>(`/social-automation/rules/${appId}`),
    );

  /**
   * Toggle an automation rule between active and paused.
   * Maps to PATCH /social-automation/rules/:id/status
   */
  const toggleRule = (ruleId: string, status: AutomationRuleStatus) =>
    run(() =>
      apiPatch<ApiResponse<AutomationRule>>(`/social-automation/rules/${ruleId}/status`, {
        status,
      }),
    );

  // ── Webhook / Simulation ─────────────────────────────────────────────────

  /**
   * Simulate an inbound social message to test your automation rules.
   * Maps to POST /social-automation/webhook/simulate
   */
  const simulateMessage = (
    platform: SocialPlatform,
    platformUserId: string,
    message: string,
  ) =>
    run(() =>
      apiPost<ApiResponse<{ triggered: boolean; reply?: string }>>(
        '/social-automation/webhook/simulate',
        { platform, platformUserId, message },
      ),
    );

  // ── Talent Hiring ─────────────────────────────────────────────────────────

  /**
   * Send a hire request to a UGC talent creator.
   * Maps to POST /social-automation/hire/:talentId
   */
  const hireTalent = (talentId: string, payload: HireTalentPayload) =>
    run(() =>
      apiPost<ApiResponse<HireRequest>>(
        `/social-automation/hire/${talentId}`,
        payload,
      ),
    );

  /**
   * List all talent hire requests sent by the authenticated CEO.
   * Maps to GET /social-automation/hire-requests
   */
  const getHireRequests = () =>
    run(() => apiGetAuth<ApiResponse<HireRequest[]>>('/social-automation/hire-requests'));

  // ── OAuth Account Connection ───────────────────────────────────────────────

  /**
   * Get OAuth authorization URL for a platform.
   * Maps to GET /oauth/:platform/connect?appId=xxx
   */
  const getOAuthUrl = (platform: OAuthPlatform, appId: string) =>
    run(() =>
      apiGetAuth<{ authUrl: string }>(`/oauth/${platform}/connect?appId=${appId}`),
    );

  /**
   * Get connected accounts for an app.
   * Maps to GET /oauth/accounts/:appId
   */
  const getConnectedAccounts = (appId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<SocialAccount[]>>(`/oauth/accounts/${appId}`),
    );

  /**
   * Disconnect a social account.
   * Maps to DELETE /oauth/accounts/:accountId
   */
  const disconnectAccount = (accountId: string) =>
    run(() =>
      apiDelete<{ success: boolean }>(`/oauth/accounts/${accountId}`),
    );

  return {
    // Account management
    connectAccount,
    getAccounts,
    // OAuth
    getOAuthUrl,
    getConnectedAccounts,
    disconnectAccount,
    // Automation rules
    createRule,
    getRules,
    toggleRule,
    // Testing
    simulateMessage,
    // Talent
    hireTalent,
    getHireRequests,
    // State
    isLoading,
    error,
  };
};
