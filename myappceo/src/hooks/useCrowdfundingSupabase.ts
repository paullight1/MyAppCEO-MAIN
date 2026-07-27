import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useApiRunner } from './useApiRunner';
import { apiGet, apiGetAuth, apiPatch, apiPost } from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import {
  CampaignStatus,
  calculateStakeFromCampaign,
  validateCampaignDraft,
} from '../utils/fundingOwnership';

export interface CrowdfundingCampaign {
  id: string;
  ownerId: string;
  listingId?: string;
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
  fundingType: string;
  campaignType: string;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  fundedAt?: string;
  maxInvestors: number;
  currentInvestorCount: number;
  isPublic: boolean;
  shareToken?: string;
  currency?: string;
  cancellationReason?: string;
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
  paymentProvider?: string;
  paymentReference?: string;
  idempotencyKey?: string;
  committedAt: string;
  paidAt?: string;
}

export interface CampaignUpdate {
  id: string;
  campaignId: string;
  authorId: string;
  title: string;
  content: string;
  updateType: string;
  isPublic: boolean;
  createdAt: string;
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

export interface ShareLink {
  id: string;
  campaignId: string;
  shareToken: string;
  uses: number;
  maxUses?: number;
  expiresAt?: string;
  shareUrl?: string;
  createdAt: string;
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

interface DbCampaign {
  id: string;
  owner_id: string;
  listing_id?: string;
  idea_id?: string;
  app_id?: string;
  title: string;
  slug: string;
  short_description?: string;
  long_description?: string;
  cover_image_url?: string;
  video_url?: string;
  funding_goal: number;
  funding_raised: number;
  min_investment: number;
  max_investment?: number;
  equity_offered_pct: number;
  pre_money_valuation: number;
  platform_fee_pct: number;
  funding_type: string;
  campaign_type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  funded_at?: string;
  max_investors: number;
  current_investor_count: number;
  is_public: boolean;
  share_token?: string;
  currency?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

interface DbCommitment {
  id: string;
  campaign_id: string;
  investor_id: string;
  amount: number;
  stake_pct: number;
  valuation_at_commitment: number;
  status: string;
  stripe_payment_intent_id?: string;
  payment_provider?: string;
  payment_reference?: string;
  idempotency_key?: string;
  committed_at: string;
  paid_at?: string;
}

interface DbShareLink {
  id: string;
  campaign_id: string;
  share_token: string;
  uses: number;
  max_uses?: number;
  expires_at?: string;
  share_url?: string;
  created_at: string;
}

const toCampaign = (db: any): CrowdfundingCampaign => ({
  id: db.id,
  ownerId: db.ownerId ?? db.owner_id,
  listingId: db.listingId ?? db.listing_id,
  ideaId: db.ideaId ?? db.idea_id,
  appId: db.appId ?? db.app_id,
  title: db.title,
  slug: db.slug,
  shortDescription: db.shortDescription ?? db.short_description,
  longDescription: db.longDescription ?? db.long_description,
  coverImageUrl: db.coverImageUrl ?? db.cover_image_url,
  videoUrl: db.videoUrl ?? db.video_url,
  fundingGoal: Number(db.fundingGoal ?? db.funding_goal ?? 0),
  fundingRaised: Number(db.fundingRaised ?? db.funding_raised ?? 0),
  minInvestment: Number(db.minInvestment ?? db.min_investment ?? 0),
  maxInvestment: db.maxInvestment ?? db.max_investment,
  equityOfferedPct: Number(db.equityOfferedPct ?? db.equity_offered_pct ?? 0),
  preMoneyValuation: Number(db.preMoneyValuation ?? db.pre_money_valuation ?? 0),
  platformFeePct: Number(db.platformFeePct ?? db.platform_fee_pct ?? 0),
  fundingType: db.fundingType ?? db.funding_type,
  campaignType: db.campaignType ?? db.campaign_type ?? db.fundingType ?? db.funding_type,
  status: (db.status || 'draft') as CampaignStatus,
  startDate: db.startDate ?? db.start_date,
  endDate: db.endDate ?? db.end_date,
  fundedAt: db.fundedAt ?? db.funded_at,
  maxInvestors: Number(db.maxInvestors ?? db.max_investors ?? 0),
  currentInvestorCount: Number(db.currentInvestorCount ?? db.current_investor_count ?? 0),
  isPublic: Boolean(db.isPublic ?? db.is_public),
  shareToken: db.shareToken ?? db.share_token,
  currency: db.currency,
  cancellationReason: db.cancellationReason ?? db.cancellation_reason,
  createdAt: db.createdAt ?? db.created_at,
  updatedAt: db.updatedAt ?? db.updated_at,
});

const toCommitment = (db: any): InvestmentCommitment => ({
  id: db.id,
  campaignId: db.campaignId ?? db.campaign_id,
  investorId: db.investorId ?? db.investor_id,
  amount: Number(db.amount || 0),
  stakePct: Number(db.stakePct ?? db.stake_pct ?? 0),
  valuationAtCommitment: Number(db.valuationAtCommitment ?? db.valuation_at_commitment ?? 0),
  status: db.status,
  stripePaymentIntentId: db.stripePaymentIntentId ?? db.stripe_payment_intent_id,
  paymentProvider: db.paymentProvider ?? db.payment_provider,
  paymentReference: db.paymentReference ?? db.payment_reference,
  idempotencyKey: db.idempotencyKey ?? db.idempotency_key,
  committedAt: db.committedAt ?? db.committed_at,
  paidAt: db.paidAt ?? db.paid_at,
});

const toShareLink = (db: DbShareLink | any): ShareLink => ({
  id: db.id,
  campaignId: db.campaignId ?? db.campaign_id,
  shareToken: db.shareToken ?? db.share_token,
  uses: db.uses,
  maxUses: db.maxUses ?? db.max_uses,
  expiresAt: db.expiresAt ?? db.expires_at,
  shareUrl: db.shareUrl ?? db.share_url,
  createdAt: db.createdAt ?? db.created_at,
});

const generateSlug = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);

export const useCrowdfunding = () => {
  const { user } = useAuth();
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const createCampaign = useCallback(async (formData: {
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
    fundingType?: string;
    campaignType?: string;
    durationDays?: number;
    maxInvestors?: number;
    ideaId?: string;
    listingId?: string;
    appId?: string;
  }) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const validation = validateCampaignDraft({
      title: formData.title,
      fundingGoal: formData.fundingGoal,
      minInvestment: formData.minInvestment || 100,
      maxInvestment: formData.maxInvestment,
      equityOfferedPct: formData.equityOfferedPct,
      preMoneyValuation: formData.preMoneyValuation,
      maxInvestors: formData.maxInvestors || 100,
      durationDays: formData.durationDays,
      appId: formData.appId,
      ideaId: formData.ideaId,
    });
    if (!validation.isValid) throw new Error(validation.errors.join(' '));

    const response = await apiPost<ApiResponse<CrowdfundingCampaign>>('/crowdfunding/campaigns', {
      title: formData.title,
      shortDescription: formData.shortDescription,
      longDescription: formData.longDescription,
      coverImageUrl: formData.coverImageUrl,
      videoUrl: formData.videoUrl,
      fundingGoal: formData.fundingGoal,
      minInvestment: formData.minInvestment || 100,
      maxInvestment: formData.maxInvestment || undefined,
      equityOfferedPct: formData.equityOfferedPct,
      preMoneyValuation: formData.preMoneyValuation,
      fundingType: formData.fundingType || 'split',
      campaignType: formData.campaignType || 'build',
      durationDays: formData.durationDays,
      maxInvestors: formData.maxInvestors || 100,
      ideaId: formData.ideaId || undefined,
      appId: formData.appId || undefined,
    });

    return { success: true, data: toCampaign(response.data) };
  }), [user, run]);

  const getCampaigns = useCallback(async (filters: Record<string, string> = {}) => run(async () => {
    const qs = new URLSearchParams(filters).toString();
    const response = await apiGet<ApiResponse<CrowdfundingCampaign[]>>(
      `/crowdfunding/campaigns${qs ? `?${qs}` : ''}`,
    );
    return { success: true, data: ((response.data || []) as any[]).map(toCampaign) };
  }), [run]);

  const getMyCampaigns = useCallback(async () => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const response = await apiGetAuth<ApiResponse<CrowdfundingCampaign[]>>('/crowdfunding/campaigns/me');
    return { success: true, data: ((response.data || []) as any[]).map(toCampaign) };
  }), [user, run]);

  const getCampaignById = useCallback(async (id: string) => run(async () => {
    const response = await apiGet<ApiResponse<CrowdfundingCampaign>>(`/crowdfunding/campaigns/${id}`);
    return { success: true, data: toCampaign(response.data) };
  }), [run]);

  const getCampaignBySlug = useCallback(async (slug: string) => run(async () => {
    const response = await apiGet<ApiResponse<CrowdfundingCampaign>>(`/crowdfunding/campaigns/slug/${slug}`);
    return { success: true, data: toCampaign(response.data) };
  }), [run]);

  const updateCampaign = useCallback(async (id: string, updates: Partial<CrowdfundingCampaign>) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const response = await apiPatch<ApiResponse<CrowdfundingCampaign>>(`/crowdfunding/campaigns/${id}`, updates);
    return { success: true, data: toCampaign(response.data) };
  }), [user, run]);

  const publishCampaign = useCallback(async (id: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const response = await apiPost<ApiResponse<CrowdfundingCampaign>>(`/crowdfunding/campaigns/${id}/publish`, {});
    return { success: true, data: toCampaign(response.data) };
  }), [user, run]);

  const cancelCampaign = useCallback(async (id: string, reason?: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    if (!reason?.trim()) throw new Error('Cancellation reason is required.');
    const response = await apiPost<ApiResponse<CrowdfundingCampaign>>(`/crowdfunding/campaigns/${id}/cancel`, { reason });
    return { success: true, data: toCampaign(response.data) };
  }), [user, run]);

  const getInvestors = useCallback(async (campaignId: string) => run(async () => {
    const response = await apiGetAuth<ApiResponse<Investor[]>>(`/crowdfunding/campaigns/${campaignId}/investors`);
    return { success: true, data: response.data || [] };
  }), [run]);

  const commitInvestment = useCallback(async (campaignId: string, amount: number, returnUri?: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const idempotencyKey = `${user.id}:${campaignId}:${amount}`;
    const response = await apiPost<ApiResponse<{
      commitment: InvestmentCommitment;
      clientSecret: string | null;
      authorizationUrl?: string;
      accessCode?: string;
      reference?: string;
      provider?: 'paystack';
      requiresAction: boolean;
      simulated?: boolean;
    }>>(`/crowdfunding/campaigns/${campaignId}/invest`, { amount, returnUri, idempotencyKey });

    return {
      success: true,
      data: {
        ...response.data,
        commitment: response.data?.commitment ? toCommitment(response.data.commitment) : response.data?.commitment,
      },
    };
  }), [user, run]);

  const confirmInvestment = useCallback(async (
    campaignId: string,
    commitmentId: string,
    paymentReference?: string,
  ) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const response = await apiPost<ApiResponse<{ success: boolean; campaign: CrowdfundingCampaign }>>(
      `/crowdfunding/campaigns/${campaignId}/confirm`,
      { commitmentId, paymentReference: paymentReference || `simulated_${commitmentId}` },
    );

    return { success: true, data: response.data };
  }), [user, run]);

  const calculateStake = useCallback(async (campaignId: string, amount: number) => run(async () => {
    try {
      const response = await apiPost<ApiResponse<StakeCalculation>>(
        `/crowdfunding/campaigns/${campaignId}/calculate-stake`,
        { amount },
      );
      return { success: true, data: response.data };
    } catch {
      const campaignResponse = await apiGet<ApiResponse<CrowdfundingCampaign>>(`/crowdfunding/campaigns/${campaignId}`);
      const campaign = toCampaign(campaignResponse.data);
      return {
        success: true,
        data: calculateStakeFromCampaign({
          amount,
          fundingGoal: campaign.fundingGoal,
          fundingRaised: campaign.fundingRaised,
          minInvestment: campaign.minInvestment,
          maxInvestment: campaign.maxInvestment,
          preMoneyValuation: campaign.preMoneyValuation,
          equityOfferedPct: campaign.equityOfferedPct,
          currentInvestorCount: campaign.currentInvestorCount,
          maxInvestors: campaign.maxInvestors,
        }),
      };
    }
  }), [run]);

  const createShareLink = useCallback(async (campaignId: string, options?: { expiresInDays?: number; maxUses?: number }) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const response = await apiPost<ApiResponse<ShareLink>>(
      `/crowdfunding/campaigns/${campaignId}/share`,
      options || {},
    );
    return { success: true, data: toShareLink(response.data) };
  }), [user, run]);

  const getCampaignByShareToken = useCallback(async (token: string) => run(async () => {
    const response = await apiGet<ApiResponse<CrowdfundingCampaign>>(`/crowdfunding/invest/${token}`);
    return { success: true, data: toCampaign(response.data) };
  }), [run]);

  const getMyInvestments = useCallback(async () => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const response = await apiGetAuth<ApiResponse<{ commitment: InvestmentCommitment; campaign: CrowdfundingCampaign }[]>>('/crowdfunding/my-investments');
    return {
      success: true,
      data: (response.data || []).map((d: any) => ({
        commitment: toCommitment(d.commitment),
        campaign: toCampaign(d.campaign),
      })),
    };
  }), [user, run]);

  const getWatchlist = useCallback(async () => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data, error: fetchError } = await supabase
      .from('campaign_watchlists')
      .select('campaign_id')
      .eq('user_id', user.id);
    if (fetchError) throw fetchError;
    return { success: true, data: (data || []).map((item: any) => item.campaign_id as string) };
  }), [user, run]);

  const setWatchlistCampaign = useCallback(async (campaignId: string, watched: boolean) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    if (watched) {
      const { error: upsertError } = await supabase
        .from('campaign_watchlists')
        .upsert({ user_id: user.id, campaign_id: campaignId }, { onConflict: 'user_id,campaign_id' });
      if (upsertError) throw upsertError;
    } else {
      const { error: deleteError } = await supabase
        .from('campaign_watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('campaign_id', campaignId);
      if (deleteError) throw deleteError;
    }
    return { success: true };
  }), [user, run]);

  const migrateLocalWatchlist = useCallback(async (campaignIds: string[]) => run(async () => {
    if (!user || campaignIds.length === 0) return { success: true, data: [] };
    const rows = Array.from(new Set(campaignIds)).map((campaignId) => ({
      user_id: user.id,
      campaign_id: campaignId,
    }));
    const { error: upsertError } = await supabase
      .from('campaign_watchlists')
      .upsert(rows, { onConflict: 'user_id,campaign_id' });
    if (upsertError) throw upsertError;
    return { success: true, data: rows.map((row) => row.campaign_id) };
  }), [user, run]);

  const getCampaignUpdates = useCallback(async (campaignId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('campaign_updates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    if (fetchError) throw fetchError;
    return { success: true, data: (data || []).map((d: any) => ({
      id: d.id,
      campaignId: d.campaign_id,
      authorId: d.author_id,
      title: d.title,
      content: d.content,
      updateType: d.update_type,
      isPublic: d.is_public,
      createdAt: d.created_at,
    })) };
  }), [run]);

  const postCampaignUpdate = useCallback(async (campaignId: string, title: string, content: string, updateType?: string, isPublic?: boolean) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data, error: insertError } = await supabase
      .from('campaign_updates')
      .insert({
        campaign_id: campaignId,
        author_id: user.id,
        title,
        content,
        update_type: updateType || 'general',
        is_public: isPublic || false,
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return { success: true, data: {
      id: data.id,
      campaignId: data.campaign_id,
      authorId: data.author_id,
      title: data.title,
      content: data.content,
      updateType: data.update_type,
      isPublic: data.is_public,
      createdAt: data.created_at,
    } };
  }), [user, run]);

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
    commitInvestment,
    confirmInvestment,
    calculateStake,
    createShareLink,
    getCampaignByShareToken,
    getMyInvestments,
    getWatchlist,
    setWatchlistCampaign,
    migrateLocalWatchlist,
    getCampaignUpdates,
    postCampaignUpdate,
    isLoading,
    error,
  };
};
