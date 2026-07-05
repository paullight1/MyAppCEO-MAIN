import { useCallback } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiGet, apiGetAuth, apiPost, apiPatch, apiUpload } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TalentProfile {
  id: string;
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  niche?: string;
  niches?: string[];
  platforms?: string[];
  rate?: number;
  reach?: number;
  rating?: number;
  completedCampaigns?: number;
  availability?: 'available' | 'limited' | 'unavailable';
  creatorScore?: number;
  portfolioUrl?: string;
  portfolio?: Array<{ type: 'video' | 'image' | 'link'; url: string; title?: string }>;
  approved: boolean;
  createdAt: string;
}

export interface UGCContent {
  id: string;
  creatorId: string;
  listingId?: string;
  campaignId?: string;
  videoUrl?: string;
  caption?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested' | 'delivered' | 'paid';
  createdAt: string;
}

export interface CreatorSearchFilters {
  search?: string;
  platform?: string;
  niche?: string;
  minRate?: number;
  maxRate?: number;
  availability?: TalentProfile['availability'];
  minCreatorScore?: number;
}

export interface CreatePortfolioPayload {
  bio?: string;
  niche?: string;
  platforms?: string[];
  rate?: number;
  portfolioUrl?: string;
}

export interface SubmitUGCPayload {
  listingId?: string;
  campaignId?: string;
  videoUrl?: string;
  caption?: string;
}

export interface CreatorHiringRequest {
  id: string;
  talentId: string;
  appId: string;
  campaignId?: string;
  proposal: string;
  budget: number;
  escrowHandoffUrl?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision_requested' | 'delivered' | 'paid';
  createdAt: string;
  updatedAt?: string;
}

const buildCreatorQuery = (filters: CreatorSearchFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.niche && filters.niche !== 'All') params.set('niche', filters.niche);
  if (typeof filters.minRate === 'number') params.set('minRate', String(filters.minRate));
  if (typeof filters.maxRate === 'number' && Number.isFinite(filters.maxRate)) params.set('maxRate', String(filters.maxRate));
  if (filters.availability) params.set('availability', filters.availability);
  if (typeof filters.minCreatorScore === 'number') params.set('minCreatorScore', String(filters.minCreatorScore));
  const query = params.toString();
  return query ? `?${query}` : '';
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCreators = () => {
  const { run, isLoading, error } = useApiRunner();

  /**
   * Fetch all approved talent profiles (public).
   * Maps to GET /creators/talents
   */
  const getAllTalents = useCallback((filters?: CreatorSearchFilters) =>
    run(() => apiGet<ApiResponse<TalentProfile[]>>(`/creators/talents${buildCreatorQuery(filters)}`)), [run]);

  /**
   * Fetch a specific talent's portfolio.
   * Maps to GET /creators/portfolio/:talentId
   */
  const getTalentPortfolio = useCallback((talentId: string) =>
    run(() => apiGet<ApiResponse<TalentProfile>>(`/creators/portfolio/${talentId}`)), [run]);

  /**
   * Create or update the authenticated user's talent portfolio.
   * Maps to POST /creators/portfolio
   */
  const savePortfolio = useCallback((payload: CreatePortfolioPayload) =>
    run(() => apiPost<ApiResponse<TalentProfile>>('/creators/portfolio', payload)), [run]);

  const updatePortfolio = useCallback((payload: Partial<CreatePortfolioPayload>) =>
    run(() => apiPatch<ApiResponse<TalentProfile>>('/creators/portfolio', payload)), [run]);

  /**
   * Submit UGC content for editorial review.
   * Maps to POST /creators/ugc
   */
  const submitUGC = useCallback((payload: SubmitUGCPayload) =>
    run(() => apiPost<ApiResponse<UGCContent>>('/creators/ugc', payload)), [run]);

  const uploadUGCAsset = useCallback((formData: FormData) =>
    run(() => apiUpload<ApiResponse<{ url: string; contentType?: string; size?: number }>>('/creators/ugc/upload', formData)), [run]);

  /**
   * Fetch recently approved UGC content (public feed).
   * Maps to GET /creators/ugc/recent
   */
  const getRecentUGC = useCallback(() =>
    run(() => apiGet<ApiResponse<UGCContent[]>>('/creators/ugc/recent')), [run]);

  const getMyUGC = useCallback(() =>
    run(() => apiGetAuth<ApiResponse<UGCContent[]>>('/creators/ugc/mine')), [run]);

  const getHiringRequests = useCallback(() =>
    run(() => apiGetAuth<ApiResponse<CreatorHiringRequest[]>>('/creators/hiring-requests')), [run]);

  return {
    getAllTalents,
    getTalentPortfolio,
    savePortfolio,
    updatePortfolio,
    submitUGC,
    uploadUGCAsset,
    getRecentUGC,
    getMyUGC,
    getHiringRequests,
    isLoading,
    error,
  };
};
