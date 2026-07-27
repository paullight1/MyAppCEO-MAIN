import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useApiRunner } from './useApiRunner';

export interface LegalEntity {
  id: string;
  app_id: string;
  entity_type: string;
  jurisdiction?: string;
  entity_name?: string;
  registration_number?: string;
  ein?: string;
  formed_at?: string;
  registered_agent?: string;
  operating_agreement_signed: boolean;
  bylaws_adopted: boolean;
  status: string;
}

export interface FounderAgreement {
  id: string;
  app_id: string;
  vesting_schedule: string;
  cliff_months: number;
  acceleration_clause: string;
  ip_assignment: boolean;
  non_compete: boolean;
  decision_making: string;
  dispute_resolution: string;
  signed_by_founder: boolean;
  signed_by_all: boolean;
  signed_at?: string;
}

export const useLegalEntity = () => {
  const { user } = useAuth();
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const validateEntity = (entity: Partial<LegalEntity> & { entity_type?: string }) => {
    const allowedTypes = ['llc', 'c_corp', 's_corp', 'corporation', 'partnership', 'sole_proprietorship', 'foundation', 'not_formed'];
    if (entity.entity_type && !allowedTypes.includes(entity.entity_type)) throw new Error('Invalid legal entity type.');
    if (entity.entity_type && entity.entity_type !== 'not_formed' && !entity.jurisdiction) {
      throw new Error('Jurisdiction is required for formed entities.');
    }
    if (entity.status && !['not_formed', 'pending', 'formed', 'verified', 'rejected'].includes(entity.status)) {
      throw new Error('Invalid legal entity status.');
    }
  };

  const getEntity = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('legal_entities')
      .select('*')
      .eq('app_id', appId)
      .single();
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    return { success: true, data };
  }), [run]);

  const createEntity = useCallback(async (appId: string, entity: {
    entity_type: string;
    jurisdiction?: string;
    entity_name?: string;
  }) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    validateEntity(entity);
    const { data, error: insertError } = await supabase
      .from('legal_entities')
      .insert({
        app_id: appId,
        entity_type: entity.entity_type,
        jurisdiction: entity.jurisdiction,
        entity_name: entity.entity_name,
        status: 'pending',
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return { success: true, data };
  }), [user, run]);

  const updateEntity = useCallback(async (appId: string, updates: Partial<LegalEntity>) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    validateEntity(updates);
    const { data, error: updateError } = await supabase
      .from('legal_entities')
      .update(updates)
      .eq('app_id', appId)
      .select()
      .single();
    if (updateError) throw updateError;
    return { success: true, data };
  }), [user, run]);

  const getAgreement = useCallback(async (appId: string) => run(async () => {
    const { data, error: fetchError } = await supabase
      .from('founder_agreements')
      .select('*')
      .eq('app_id', appId)
      .single();
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    return { success: true, data };
  }), [run]);

  const createAgreement = useCallback(async (appId: string, agreement: {
    vesting_schedule?: string;
    cliff_months?: number;
    acceleration_clause?: string;
    ip_assignment?: boolean;
    non_compete?: boolean;
    decision_making?: string;
    dispute_resolution?: string;
  }) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    if (agreement.cliff_months != null && (agreement.cliff_months < 0 || agreement.cliff_months > 48)) {
      throw new Error('Cliff months must be between 0 and 48.');
    }
    const { data, error: insertError } = await supabase
      .from('founder_agreements')
      .insert({
        app_id: appId,
        vesting_schedule: agreement.vesting_schedule || 'standard_4yr_1yr',
        cliff_months: agreement.cliff_months || 12,
        acceleration_clause: agreement.acceleration_clause || 'single_trigger',
        ip_assignment: agreement.ip_assignment ?? true,
        non_compete: agreement.non_compete ?? false,
        decision_making: agreement.decision_making || 'equal',
        dispute_resolution: agreement.dispute_resolution || 'mediation',
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return { success: true, data };
  }), [user, run]);

  const signAgreement = useCallback(async (appId: string) => run(async () => {
    if (!user) throw new Error('Must be logged in');
    const { data, error: updateError } = await supabase
      .from('founder_agreements')
      .update({ signed_by_founder: true, signed_at: new Date().toISOString() })
      .eq('app_id', appId)
      .select()
      .single();
    if (updateError) throw updateError;
    return { success: true, data };
  }), [user, run]);

  return {
    getEntity,
    createEntity,
    updateEntity,
    getAgreement,
    createAgreement,
    signAgreement,
    isLoading,
    error,
  };
};
