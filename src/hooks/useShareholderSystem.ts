import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useApiRunner } from './useApiRunner';

export interface ShareholderOffer {
  id: string;
  app_id: string;
  price_per_share: number;
  min_shares: number;
  max_shares?: number;
  total_available?: number;
  conditions?: string;
  terms_url?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShareholderRequest {
  id: string;
  app_id: string;
  user_id: string;
  offer_id?: string;
  shares_requested: number;
  total_investment?: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  user_profile?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export const useShareholderSystem = () => {
  const { user } = useAuth();
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const validateOffer = (offer: {
    price_per_share: number;
    min_shares?: number;
    max_shares?: number;
    total_available?: number;
    expires_at?: string;
  }) => {
    if (!Number.isFinite(offer.price_per_share) || offer.price_per_share <= 0) throw new Error('Price per share must be greater than zero.');
    if (offer.min_shares && offer.min_shares < 1) throw new Error('Minimum shares must be at least 1.');
    if (offer.max_shares && offer.min_shares && offer.max_shares < offer.min_shares) throw new Error('Maximum shares cannot be lower than minimum shares.');
    if (offer.total_available && offer.total_available < 1) throw new Error('Total available shares must be at least 1.');
    if (offer.expires_at && new Date(offer.expires_at) <= new Date()) throw new Error('Offer expiry must be in the future.');
  };

  const getOffers = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('app_shareholder_offers')
      .select('*')
      .eq('app_id', appId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return data as ShareholderOffer[];
  }), [user, run]);

  const createOffer = useCallback(async (appId: string, offer: {
    price_per_share: number;
    min_shares?: number;
    max_shares?: number;
    total_available?: number;
    conditions?: string;
    terms_url?: string;
    expires_at?: string;
  }) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    validateOffer({ ...offer, min_shares: offer.min_shares || 1 });
    const { data, error: insertError } = await supabase
      .from('app_shareholder_offers')
      .insert({
        app_id: appId,
        ...offer,
        min_shares: offer.min_shares || 1,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return data as ShareholderOffer;
  }), [run]);

  const updateOffer = useCallback(async (offerId: string, updates: Partial<ShareholderOffer>) => run(async () => {
    if (updates.price_per_share || updates.min_shares || updates.max_shares || updates.total_available || updates.expires_at) {
      validateOffer({
        price_per_share: Number(updates.price_per_share || 1),
        min_shares: updates.min_shares,
        max_shares: updates.max_shares,
        total_available: updates.total_available,
        expires_at: updates.expires_at,
      });
    }
    const { data, error: updateError } = await supabase
      .from('app_shareholder_offers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data as ShareholderOffer;
  }), [run]);

  const toggleOffer = useCallback(async (offerId: string) => run(async () => {
    const { data, error: updateError } = await supabase
      .from('app_shareholder_offers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data as ShareholderOffer;
  }), [run]);

  const getRequests = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('app_shareholder_requests')
      .select(`
        *,
        user_profile:user_profiles(full_name, email, avatar_url)
      `)
      .eq('app_id', appId)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return data as ShareholderRequest[];
  }), [run]);

  const getMyRequests = useCallback(async () => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data, error: fetchError } = await supabase
      .from('app_shareholder_requests')
      .select(`
        *,
        listing:listings(name, slug)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return data;
  }), [user, run]);

  const submitRequest = useCallback(async (appId: string, offerId: string, shares: number, message?: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    // Get offer details to calculate investment
    if (!Number.isFinite(shares) || shares < 1) throw new Error('Requested shares must be greater than zero.');
    const { data: offer, error: offerError } = await supabase
      .from('app_shareholder_offers')
      .select('price_per_share,min_shares,max_shares,total_available,expires_at,is_active')
      .eq('id', offerId)
      .eq('app_id', appId)
      .eq('is_active', true)
      .single();
    if (offerError || !offer) throw offerError || new Error('Shareholder offer is no longer available.');
    if (offer.expires_at && new Date(offer.expires_at) <= new Date()) throw new Error('Shareholder offer has expired.');
    if (shares < Number(offer.min_shares || 1)) throw new Error('Requested shares are below the offer minimum.');
    if (offer.max_shares && shares > Number(offer.max_shares)) throw new Error('Requested shares exceed the offer maximum.');
    if (offer.total_available && shares > Number(offer.total_available)) throw new Error('Requested shares exceed available shares.');

    const totalInvestment = shares * Number(offer.price_per_share);

    const { data, error: insertError } = await supabase
      .from('app_shareholder_requests')
      .insert({
        app_id: appId,
        user_id: user.id,
        offer_id: offerId,
        shares_requested: shares,
        total_investment: totalInvestment,
        status: 'pending',
        message: message || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return data as ShareholderRequest;
  }), [user, run]);

  const approveRequest = useCallback(async (requestId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data, error: updateError } = await supabase
      .from('app_shareholder_requests')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Add as shareholder in app_members
    const request = data as ShareholderRequest;
    await supabase
      .from('app_members')
      .upsert({
        app_id: request.app_id,
        user_id: request.user_id,
        role: 'shareholder',
        status: 'active',
        invited_by: user.id,
        joined_at: new Date().toISOString(),
      }, { onConflict: 'app_id,user_id', ignoreDuplicates: true });

    return data as ShareholderRequest;
  }), [user, run]);

  const rejectRequest = useCallback(async (requestId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');

    const { data, error: updateError } = await supabase
      .from('app_shareholder_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data as ShareholderRequest;
  }), [user, run]);

  return {
    getOffers,
    createOffer,
    updateOffer,
    toggleOffer,
    getRequests,
    getMyRequests,
    submitRequest,
    approveRequest,
    rejectRequest,
    isLoading,
    error,
  };
};
