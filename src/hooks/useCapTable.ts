import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApiRunner } from './useApiRunner';

export interface CapTableEntry {
  id: string;
  app_id: string;
  owner_id?: string;
  owner_type: string;
  share_class_id?: string;
  shares_count: number;
  equity_pct: number;
  price_per_share: number;
  total_value: number;
  issued_at: string;
  diluted: boolean;
  owner_name?: string;
  share_class_name?: string;
}

export interface ShareClass {
  id: string;
  app_id: string;
  class_name: string;
  class_type: string;
  total_shares: number;
  issued_shares: number;
  voting_rights: string;
  dividend_rights: string;
  liquidation_preference: string;
}

export interface OptionPool {
  id: string;
  app_id: string;
  total_options: number;
  granted_options: number;
}

export interface DilutionResult {
  preMoneyValuation: number;
  investmentAmount: number;
  newShares: number;
  newInvestorPct: number;
  existingPcts: { owner_type: string; old_pct: number; new_pct: number }[];
}

export const useCapTable = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const validateEntry = (entry: {
    owner_type: string;
    shares_count: number;
    price_per_share: number;
    equity_pct?: number;
  }) => {
    const allowedOwnerTypes = ['founder', 'cofounder', 'investor', 'employee', 'advisor', 'option_pool'];
    if (!allowedOwnerTypes.includes(entry.owner_type)) throw new Error('Invalid owner type.');
    if (!Number.isFinite(entry.shares_count) || entry.shares_count <= 0) throw new Error('Shares must be greater than zero.');
    if (!Number.isFinite(entry.price_per_share) || entry.price_per_share < 0) throw new Error('Price per share cannot be negative.');
    if (entry.equity_pct != null && (!Number.isFinite(entry.equity_pct) || entry.equity_pct < 0 || entry.equity_pct > 100)) {
      throw new Error('Equity percentage must be between 0 and 100.');
    }
  };

  const getCapTable = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('cap_table_entries')
      .select(`
        *,
        user_profiles(full_name, avatar_url),
        share_classes(class_name, class_type)
      `)
      .eq('app_id', appId)
      .order('equity_pct', { ascending: false });
    if (fetchError) throw fetchError;
    return { success: true, data };
  }), [run]);

  const addEntry = useCallback(async (appId: string, entry: {
    owner_id?: string;
    owner_type: string;
    share_class_id?: string;
    shares_count: number;
    price_per_share: number;
    equity_pct?: number;
  }) => run(async () => {
    validateEntry(entry);

    if (entry.share_class_id) {
      const { data: shareClass, error: shareClassError } = await supabase
        .from('share_classes')
        .select('id,total_shares,issued_shares')
        .eq('id', entry.share_class_id)
        .eq('app_id', appId)
        .single();
      if (shareClassError) throw shareClassError;
      if (Number(shareClass.issued_shares || 0) + entry.shares_count > Number(shareClass.total_shares || 0)) {
        throw new Error('Share issue would exceed authorized shares for this class.');
      }
    }

    const { data: existingEntries, error: totalError } = await supabase
      .from('cap_table_entries')
      .select('equity_pct,shares_count')
      .eq('app_id', appId);
    if (totalError) throw totalError;
    const existingEquity = (existingEntries || []).reduce((sum, row: any) => sum + Number(row.equity_pct || 0), 0);
    const newEquity = entry.equity_pct ?? 0;
    if (existingEquity + newEquity > 100.01) {
      throw new Error(`Only ${(100 - existingEquity).toFixed(2)}% ownership remains unallocated.`);
    }

    const { data, error: insertError } = await supabase
      .from('cap_table_entries')
      .insert({
        app_id: appId,
        owner_id: entry.owner_id,
        owner_type: entry.owner_type,
        share_class_id: entry.share_class_id,
        shares_count: entry.shares_count,
        price_per_share: entry.price_per_share,
        equity_pct: newEquity,
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return { success: true, data };
  }), [run]);

  const removeEntry = useCallback(async (entryId: string) => run(async () => {
    const { error: deleteError } = await supabase
      .from('cap_table_entries')
      .delete()
      .eq('id', entryId);
    if (deleteError) throw deleteError;
    return { success: true };
  }), [run]);

  const getShareClasses = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('share_classes')
      .select('*')
      .eq('app_id', appId);
    if (fetchError) throw fetchError;
    return { success: true, data };
  }), [run]);

  const addShareClass = useCallback(async (appId: string, shareClass: {
    class_name: string;
    class_type: string;
    total_shares: number;
    voting_rights?: string;
    dividend_rights?: string;
    liquidation_preference?: string;
  }) => run(async () => {
    if (!shareClass.class_name?.trim()) throw new Error('Share class name is required.');
    if (!Number.isFinite(shareClass.total_shares) || shareClass.total_shares <= 0) {
      throw new Error('Total shares must be greater than zero.');
    }
    const allowedTypes = ['common', 'preferred', 'options', 'restricted'];
    if (!allowedTypes.includes(shareClass.class_type)) throw new Error('Invalid share class type.');

    const { data, error: insertError } = await supabase
      .from('share_classes')
      .insert({
        app_id: appId,
        class_name: shareClass.class_name,
        class_type: shareClass.class_type,
        total_shares: shareClass.total_shares,
        voting_rights: shareClass.voting_rights || 'full',
        dividend_rights: shareClass.dividend_rights || 'equal',
        liquidation_preference: shareClass.liquidation_preference || 'none',
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return { success: true, data };
  }), [run]);

  const getOptionPool = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('option_pool')
      .select('*')
      .eq('app_id', appId)
      .single();
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    return { success: true, data };
  }), [run]);

  const updateOptionPool = useCallback(async (appId: string, totalOptions: number) => run(async () => {
    if (!Number.isFinite(totalOptions) || totalOptions < 0) throw new Error('Option pool cannot be negative.');
    const { data: existing, error: existingError } = await supabase
      .from('option_pool')
      .select('granted_options')
      .eq('app_id', appId)
      .single();
    if (existingError && existingError.code !== 'PGRST116') throw existingError;
    if (existing && Number(existing.granted_options || 0) > totalOptions) {
      throw new Error('Option pool cannot be lower than already granted options.');
    }

    const { data, error: upsertError } = await supabase
      .from('option_pool')
      .upsert({ app_id: appId, total_options: totalOptions }, { onConflict: 'app_id' })
      .select()
      .single();
    if (upsertError) throw upsertError;
    return { success: true, data };
  }), [run]);

  const calculateDilution = useCallback(async (appId: string, investmentAmount: number, preMoneyValuation: number) => run(async () => {
    const { data: entries, error: fetchError } = await supabase
      .from('cap_table_entries')
      .select('owner_type, equity_pct, shares_count')
      .eq('app_id', appId);
    if (fetchError) throw fetchError;

    const postMoneyValuation = preMoneyValuation + investmentAmount;
    const newInvestorPct = (investmentAmount / postMoneyValuation) * 100;
    const dilutionFactor = preMoneyValuation / postMoneyValuation;
    const existingShares = entries.reduce((sum, entry) => sum + Number(entry.shares_count || 0), 0);
    const pricePerShare = existingShares > 0 ? preMoneyValuation / existingShares : 0;
    const newShares = pricePerShare > 0 ? investmentAmount / pricePerShare : 0;

    const existingPcts = entries.map(e => ({
      owner_type: e.owner_type,
      old_pct: e.equity_pct,
      new_pct: Math.round(e.equity_pct * dilutionFactor * 100) / 100,
    }));

    return {
      success: true,
      data: {
        preMoneyValuation,
        investmentAmount,
        newShares: Math.round(newShares * 100) / 100,
        postMoneyValuation,
        newInvestorPct: Math.round(newInvestorPct * 100) / 100,
        dilutionFactor: Math.round(dilutionFactor * 1000) / 1000,
        existingPcts,
      } as DilutionResult,
    };
  }), [run]);

  return {
    getCapTable,
    addEntry,
    removeEntry,
    getShareClasses,
    addShareClass,
    getOptionPool,
    updateOptionPool,
    calculateDilution,
    isLoading,
    error,
  };
};
