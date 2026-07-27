import { useCallback } from 'react';
import { ApiResponse } from '../../../packages/types/src';
import { apiGet, apiPost, apiPatch } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  appId: string;
  name: string;
  description?: string;
  budget?: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  appId: string;
  name: string;
  description?: string;
  budget?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCampaigns = () => {
  const { run, isLoading, error } = useApiRunner();

  /**
   * Create a new marketing campaign.
   * Maps to POST /campaigns
   */
  const createCampaign = useCallback((payload: CreateCampaignPayload) =>
    run(() => apiPost<ApiResponse<Campaign>>('/campaigns', payload)), [run]);

  /**
   * Fetch all campaigns belonging to an app.
   * Maps to GET /campaigns/app/:appId
   */
  const getCampaignsByApp = useCallback((appId: string) =>
    run(() => apiGet<ApiResponse<Campaign[]>>(`/campaigns/app/${appId}`)), [run]);

  /**
   * Fetch a single campaign by its ID.
   * Maps to GET /campaigns/:id
   */
  const getCampaignById = useCallback((id: string) =>
    run(() => apiGet<ApiResponse<Campaign>>(`/campaigns/${id}`)), [run]);

  /**
   * Update the status of a campaign (e.g. pause / resume / cancel).
   * Maps to PATCH /campaigns/:id/status
   */
  const updateCampaignStatus = useCallback((id: string, status: CampaignStatus) =>
    run(() => apiPatch<ApiResponse<Campaign>>(`/campaigns/${id}/status`, { status })), [run]);

  return {
    createCampaign,
    getCampaignsByApp,
    getCampaignById,
    updateCampaignStatus,
    isLoading,
    error,
  };
};
