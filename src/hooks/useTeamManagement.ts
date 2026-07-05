import { useCallback } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiDelete, apiGetAuth, apiPatch, apiPost } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface Cofounder {
  id: string;
  app_id: string;
  user_id: string;
  email?: string;
  role: string;
  equity_pct: number;
  vesting_start?: string;
  cliff_date?: string;
  vesting_months: number;
  status: string;
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  left_at?: string;
  ip_assigned: boolean;
  user_profiles?: {
    full_name?: string;
    avatar_url?: string;
  } | null;
}

export const useTeamManagement = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const getCoowners = useCallback(async (appId: string) => run(async () => {
    const response = await apiGetAuth<ApiResponse<Cofounder[]>>(`/apps/${appId}/coowners`);
    return response.data || [];
  }), [run]);

  const inviteCofounder = useCallback(async (appId: string, email: string, equityPct: number, role: string, vestingMonths: number = 48) => run(async () => {
    const response = await apiPost<ApiResponse<Cofounder>>(`/apps/${appId}/coowners`, {
      email,
      role,
      equityPct,
      vestingMonths,
    });
    return response.data;
  }), [run]);

  const acceptInvite = useCallback(async (coOwnerId: string) => run(async () => {
    const response = await apiPatch<ApiResponse<Cofounder>>(`/apps/coowners/${coOwnerId}/status`, { status: 'accepted' });
    return response.data;
  }), [run]);

  const declineInvite = useCallback(async (coOwnerId: string) => run(async () => {
    const response = await apiPatch<ApiResponse<Cofounder>>(`/apps/coowners/${coOwnerId}/status`, { status: 'declined' });
    return response.data;
  }), [run]);

  const removeCofounder = useCallback(async (appId: string, coOwnerId: string) => run(async () => {
    const response = await apiDelete<ApiResponse<{ success: boolean }>>(`/apps/${appId}/coowners/${coOwnerId}`);
    return response.data || { success: true };
  }), [run]);

  const updateEquity = useCallback(async (coOwnerId: string, equityPct: number) => run(async () => {
    const response = await apiPatch<ApiResponse<Cofounder>>(`/apps/coowners/${coOwnerId}`, { equityPct });
    return response.data;
  }), [run]);

  const getPendingInvites = useCallback(async () => run(async () => {
    const response = await apiGetAuth<ApiResponse<Cofounder[]>>('/apps/coowners/pending');
    return response.data || [];
  }), [run]);

  return {
    getCoowners,
    inviteCofounder,
    acceptInvite,
    declineInvite,
    removeCofounder,
    updateEquity,
    getPendingInvites,
    isLoading,
    error,
  };
};
