import { apiGet, apiGetAuth, apiPost, apiPatch, apiPostPublic } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface CrowdfundingCampaign {
  id: string;
  ownerId: string;
  ideaId?: string;
  appId?: string;
  title: string;
  slug: string;
  shortDescription?: string;
  longDescription?: string;
  coverImageUrl?: string;
  videoUrl?: string;
  fundingGoal: number;
  fundingRaised: number;
  minInvestment: number;
  maxInvestment?: number;
  equityOfferedPct: number;
  preMoneyValuation: number;
  platformFeePct: number;
  fundingType: 'pay_once' | 'split';
  status: string;
  startDate?: string;
  endDate?: string;
  fundedAt?: string;
  maxInvestors: number;
  currentInvestorCount: number;
  isPublic: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentCommitment {
  id: string;
  campaignId: string;
  investorId: string;
  amount: number;
  stakePct: number;
  valuationAtCommitment: number;
  status: string;
  stripePaymentIntentId?: string;
  committedAt: string;
  paidAt?: string;
}

export interface Investor {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  stakePct: number;
  status: string;
  investedAt: string;
}

export interface StakeCalculation {
  amount: number;
  stakePct: number;
  stakePctFormatted: string;
  equityRemaining: number;
  fundingRemaining: number;
  valuation: number;
  minInvestment: number;
  maxInvestment: number | null;
  isValid: boolean;
  validationErrors: string[];
}

export interface ShareLink {
  shareToken: string;
  shareUrl: string;
  expiresAt?: string;
}

export const useCrowdfunding = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const createCampaign = (formData: {
    title: string;
    shortDescription?: string;
    longDescription?: string;
    coverImageUrl?: string;
    videoUrl?: string;
    fundingGoal: number;
    minInvestment?: number;
    maxInvestment?: number;
    equityOfferedPct: number;
    preMoneyValuation: number;
    fundingType?: 'pay_once' | 'split';
    durationDays?: number;
    maxInvestors?: number;
    ideaId?: string;
  }) =>
    run(() => apiPost<{ success: boolean; data: CrowdfundingCampaign }>('/crowdfunding/campaigns', formData));

  const getCampaigns = (filters: Record<string, string> = {}) =>
    run(() => {
      const qs = new URLSearchParams(filters).toString();
      return apiGet<{ success: boolean; data: CrowdfundingCampaign[] }>(`/crowdfunding/campaigns${qs ? `?${qs}` : ''}`);
    });

  const getMyCampaigns = () =>
    run(() => apiGetAuth<{ success: boolean; data: CrowdfundingCampaign[] }>('/crowdfunding/campaigns/me'));

  const getCampaignById = (id: string) =>
    run(() => apiGet<{ success: boolean; data: CrowdfundingCampaign }>(`/crowdfunding/campaigns/${id}`));

  const getCampaignBySlug = (slug: string) =>
    run(() => apiGet<{ success: boolean; data: CrowdfundingCampaign }>(`/crowdfunding/campaigns/slug/${slug}`));

  const updateCampaign = (id: string, formData: Partial<CrowdfundingCampaign>) =>
    run(() => apiPatch<{ success: boolean; data: CrowdfundingCampaign }>(`/crowdfunding/campaigns/${id}`, formData));

  const publishCampaign = (id: string) =>
    run(() => apiPost<{ success: boolean; data: CrowdfundingCampaign }>(`/crowdfunding/campaigns/${id}/publish`, {}));

  const cancelCampaign = (id: string, reason?: string) =>
    run(() => apiPost<{ success: boolean; data: CrowdfundingCampaign }>(`/crowdfunding/campaigns/${id}/cancel`, { reason }));

  const getInvestors = (campaignId: string) =>
    run(() => apiGetAuth<{ success: boolean; data: Investor[] }>(`/crowdfunding/campaigns/${campaignId}/investors`));

  const invest = (campaignId: string, data: { amount: number; paymentMethodId?: string; returnUri?: string }) =>
    run(() => apiPost<{ 
      success: boolean; 
      commitment: InvestmentCommitment;
      clientSecret: string;
      requiresAction: boolean;
    }>(`/crowdfunding/campaigns/${campaignId}/invest`, data));

  const confirmInvestment = (campaignId: string, data: { commitmentId: string; paymentIntentId: string }) =>
    run(() => apiPost<{ success: boolean; campaign: CrowdfundingCampaign }>(`/crowdfunding/campaigns/${campaignId}/confirm`, data));

  const calculateStake = (campaignId: string, amount: number) =>
    run(() => apiPost<{ success: boolean; data: StakeCalculation }>(`/crowdfunding/campaigns/${campaignId}/calculate-stake`, { amount }));

  const createShareLink = (campaignId: string, options?: { type?: string; expiresInDays?: number; maxUses?: number }) =>
    run(() => apiPost<{ success: boolean; data: ShareLink }>(`/crowdfunding/campaigns/${campaignId}/share`, options || {}));

  const getCampaignByShareToken = (token: string) =>
    run(() => apiGet<{ success: boolean; data: CrowdfundingCampaign }>(`/crowdfunding/invest/${token}`));

  const getMyInvestments = () =>
    run(() => apiGetAuth<{ success: boolean; data: { commitment: InvestmentCommitment; campaign: CrowdfundingCampaign }[] }>('/crowdfunding/my-investments'));

  return {
    createCampaign,
    getCampaigns,
    getMyCampaigns,
    getCampaignById,
    getCampaignBySlug,
    updateCampaign,
    publishCampaign,
    cancelCampaign,
    getInvestors,
    invest,
    confirmInvestment,
    calculateStake,
    createShareLink,
    getCampaignByShareToken,
    getMyInvestments,
    isLoading,
    error,
  };
};