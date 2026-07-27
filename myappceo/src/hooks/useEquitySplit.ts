import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useApiRunner } from './useApiRunner';

export interface EquitySplit {
  id: string;
  app_id: string;
  user_id: string;
  offered_by: string;
  proposed_pct: number;
  role_offered: string;
  vesting_terms: string;
  status: string;
  counter_pct?: number;
  created_at: string;
  responded_at?: string;
  target_name?: string;
  target_email?: string;
}

export const useEquitySplit = () => {
  const { user } = useAuth();
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const validatePct = (value: number, label = 'Equity percentage') => {
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      throw new Error(`${label} must be greater than 0 and no more than 100.`);
    }
  };

  const proposeSplit = useCallback(async (appId: string, targetUserId: string, proposedPct: number, role: string, vestingTerms: string = 'standard_4yr_1yr') => run(async () => {
    if (!user) throw new Error('Must be logged in');
    if (!targetUserId) throw new Error('Target user is required.');
    validatePct(proposedPct, 'Proposed equity');
    const allowedRoles = ['co_founder', 'advisor', 'employee', 'shareholder'];
    if (!allowedRoles.includes(role)) throw new Error('Invalid equity role.');

    const { data: existing, error: totalError } = await supabase
      .from('app_coowners')
      .select('equity_pct')
      .eq('app_id', appId)
      .eq('status', 'accepted');
    if (totalError) throw totalError;
    const acceptedTotal = (existing || []).reduce((sum, row: any) => sum + Number(row.equity_pct || 0), 0);
    if (acceptedTotal + proposedPct > 100) throw new Error('This proposal would exceed 100% allocated ownership.');

    const { data, error: insertError } = await supabase
      .from('equity_splits')
      .insert({
        app_id: appId,
        user_id: targetUserId,
        offered_by: user.id,
        proposed_pct: proposedPct,
        role_offered: role,
        vesting_terms: vestingTerms,
        status: 'proposed',
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return data as EquitySplit;
  }), [user, run]);

  const acceptSplit = useCallback(async (splitId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data, error: updateError } = await supabase
      .from('equity_splits')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', splitId)
      .eq('user_id', user.id)
      .eq('status', 'proposed')
      .select()
      .single();
    if (updateError) throw updateError;
    return data as EquitySplit;
  }), [user, run]);

  const declineSplit = useCallback(async (splitId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data, error: updateError } = await supabase
      .from('equity_splits')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', splitId)
      .eq('user_id', user.id)
      .eq('status', 'proposed')
      .select()
      .single();
    if (updateError) throw updateError;
    return data as EquitySplit;
  }), [user, run]);

  const counterSplit = useCallback(async (splitId: string, counterPct: number) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    validatePct(counterPct, 'Counter offer equity');
    const { data, error: updateError } = await supabase
      .from('equity_splits')
      .update({ status: 'countered', counter_pct: counterPct, responded_at: new Date().toISOString() })
      .eq('id', splitId)
      .eq('user_id', user.id)
      .eq('status', 'proposed')
      .select()
      .single();
    if (updateError) throw updateError;
    return data as EquitySplit;
  }), [user, run]);

  const getPendingSplits = useCallback(async (appId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data, error: fetchError } = await supabase
      .from('equity_splits')
      .select(`
        *,
        target_profile:user_profiles!equity_splits_user_id_fkey(full_name, avatar_url),
        offered_by_profile:user_profiles!equity_splits_offered_by_fkey(full_name, avatar_url)
      `)
      .eq('app_id', appId)
      .order('created_at', { ascending: false });
    if (fetchError) throw fetchError;
    return data as EquitySplit[];
  }), [user, run]);

  const getMyPendingOffers = useCallback(async () => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data, error: fetchError } = await supabase
      .from('equity_splits')
      .select(`
        *,
        listings(name),
        offered_by_profile:user_profiles!equity_splits_offered_by_fkey(full_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .eq('status', 'proposed')
      .order('created_at', { ascending: false });
    if (fetchError) throw fetchError;
    return data as EquitySplit[];
  }), [user, run]);

  return {
    proposeSplit,
    acceptSplit,
    declineSplit,
    counterSplit,
    getPendingSplits,
    getMyPendingOffers,
    isLoading,
    error,
  };
};
