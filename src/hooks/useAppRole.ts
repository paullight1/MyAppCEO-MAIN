import { useCallback } from 'react';
import { ApiResponse } from '../../../../packages/types/src';
import { apiGetAuth, apiPatch, apiPost } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { useApiRunner } from './useApiRunner';
import { useAuth } from './useAuth';

export interface AppMember {
  id: string;
  app_id: string;
  user_id: string;
  role: 'owner' | 'cofounder' | 'shareholder' | 'prospective' | 'admin' | 'support';
  equity_pct: number;
  shares_owned: number;
  status: 'active' | 'pending' | 'removed';
  invited_by?: string;
  joined_at: string;
  removed_at?: string;
  permissions?: any;
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
  };
}

export interface AppRole {
  role: 'owner' | 'cofounder' | 'shareholder' | 'prospective' | 'admin' | 'support';
  status: 'active' | 'pending' | 'removed';
  permissions: Record<string, boolean>;
  canAccess: (feature: string) => boolean;
  canEdit: (feature: string) => boolean;
  canDelete: (feature: string) => boolean;
}

interface AppMemberRow {
  id: string;
  app_id: string;
  user_id: string;
  role: string | null;
  equity_pct: number | null;
  shares_owned: number | null;
  status: string | null;
  invited_by?: string | null;
  joined_at?: string | null;
  removed_at?: string | null;
  permissions?: Record<string, boolean> | null;
}

interface AppWorkspaceMemberRow {
  role: string | null;
  status: string | null;
  permissions?: Record<string, boolean> | null;
}

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner: {
    view_analytics: true,
    view_cap_table: true,
    manage_team: true,
    upload_documents: true,
    view_documents: true,
    create_shareholder_offer: true,
    apply_as_shareholder: false,
    manage_finances: true,
    delete_app: true,
    change_equity_splits: true,
    post_updates: true,
    view_legal_agreements: true,
    vote_on_decisions: true,
    export_data: true,
    manage_shareholder_requests: true,
    transfer_ownership: true,
  },
  cofounder: {
    view_analytics: true,
    view_cap_table: true,
    manage_team: true,
    upload_documents: true,
    view_documents: true,
    create_shareholder_offer: false,
    apply_as_shareholder: false,
    manage_finances: false,
    delete_app: false,
    change_equity_splits: false,
    post_updates: true,
    view_legal_agreements: true,
    vote_on_decisions: true,
    export_data: true,
    manage_shareholder_requests: false,
    transfer_ownership: false,
  },
  shareholder: {
    view_analytics: true,
    view_cap_table: false,
    manage_team: false,
    upload_documents: false,
    view_documents: true,
    create_shareholder_offer: false,
    apply_as_shareholder: false,
    manage_finances: false,
    delete_app: false,
    change_equity_splits: false,
    post_updates: false,
    view_legal_agreements: true,
    vote_on_decisions: true,
    export_data: false,
    manage_shareholder_requests: false,
    transfer_ownership: false,
  },
  prospective: {
    view_analytics: false,
    view_cap_table: false,
    manage_team: false,
    upload_documents: false,
    view_documents: false,
    create_shareholder_offer: false,
    apply_as_shareholder: true,
    manage_finances: false,
    delete_app: false,
    change_equity_splits: false,
    post_updates: false,
    view_legal_agreements: false,
    vote_on_decisions: false,
    export_data: false,
    manage_shareholder_requests: false,
    transfer_ownership: false,
  },
  admin: {
    view_analytics: true,
    view_cap_table: true,
    manage_team: true,
    upload_documents: true,
    view_documents: true,
    create_shareholder_offer: true,
    apply_as_shareholder: false,
    manage_finances: true,
    delete_app: true,
    change_equity_splits: true,
    post_updates: true,
    view_legal_agreements: true,
    vote_on_decisions: true,
    export_data: true,
    manage_shareholder_requests: true,
    transfer_ownership: true,
  },
  support: {
    view_analytics: true,
    view_cap_table: true,
    manage_team: false,
    upload_documents: false,
    view_documents: true,
    create_shareholder_offer: false,
    apply_as_shareholder: false,
    manage_finances: false,
    delete_app: false,
    change_equity_splits: false,
    post_updates: false,
    view_legal_agreements: true,
    vote_on_decisions: false,
    export_data: true,
    manage_shareholder_requests: false,
    transfer_ownership: false,
  },
};

export const useAppRole = () => {
  const { user } = useAuth();
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const getRole = useCallback(async (appId: string) => run(async () => {
    if (!user) return buildAppRole('prospective', undefined, 'pending');

    const { data: workspaceMember, error: workspaceMemberError } = await supabase
      .from('app_workspace_members')
      .select('role,status,permissions')
      .eq('workspace_id', appId)
      .eq('user_id', user.id)
      .maybeSingle<AppWorkspaceMemberRow>();

    if (workspaceMemberError) {
      const code = (workspaceMemberError as { code?: string }).code;
      if (code !== '42P01' && code !== '42703') throw workspaceMemberError;
    }

    if (workspaceMember?.status && workspaceMember.status !== 'active') {
      return buildAppRole(
        normalizeRole(workspaceMember.role),
        workspaceMember.permissions,
        normalizeMemberStatus(workspaceMember.status),
      );
    }
    if (workspaceMember?.role) {
      return buildAppRole(normalizeRole(workspaceMember.role), workspaceMember.permissions, 'active');
    }

    const { data, error: memberError } = await supabase
      .from('app_members')
      .select('role,status,permissions')
      .eq('app_id', appId)
      .eq('user_id', user.id)
      .maybeSingle<Pick<AppMemberRow, 'role' | 'status' | 'permissions'>>();

    if (memberError) throw memberError;
    if (data?.status && data.status !== 'active') {
      return buildAppRole(normalizeRole(data.role), data.permissions, normalizeMemberStatus(data.status));
    }
    if (data?.role) return buildAppRole(normalizeRole(data.role), data.permissions, 'active');
    return buildAppRole('prospective');
  }), [run, user]);

  const getMembers = useCallback(async (appId: string) => run(async () => {
    const response = await apiGetAuth<ApiResponse<any[]>>(`/apps/${appId}/coowners`);
    return (response.data || []).map((member) => ({
      id: member.id,
      app_id: member.app_id,
      user_id: member.user_id,
      role: member.role === 'co_founder' ? 'cofounder' : member.role,
      equity_pct: member.equity_pct,
      shares_owned: 0,
      status: member.status === 'accepted' ? 'active' : member.status,
      invited_by: member.invited_by,
      joined_at: member.joined_at || member.invited_at,
      removed_at: member.left_at,
      user_profile: {
        full_name: member.user_profiles?.full_name || member.email,
        avatar_url: member.user_profiles?.avatar_url,
        email: member.email,
      },
    })) as AppMember[];
  }), [run]);

  const addMember = useCallback(async (appId: string, userId: string, role: string, equityPct: number = 0) => run(async () => {
    const response = await apiPost<ApiResponse<AppMember>>(`/apps/${appId}/coowners`, {
      email: userId,
      role,
      equityPct,
    });
    return response.data;
  }), [run]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: string, equityPct?: number) => run(async () => {
    const updates: Record<string, any> = { role: newRole };
    if (equityPct !== undefined) updates.equity_pct = equityPct;

    const response = await apiPatch<ApiResponse<AppMember>>(`/apps/coowners/${memberId}`, {
      role: newRole,
      equityPct,
    });
    return response.data;
  }), [run]);

  const removeMember = useCallback(async (memberId: string) => run(async () => {
    const response = await apiPatch<ApiResponse<AppMember>>(`/apps/coowners/${memberId}/status`, { status: 'departed' });
    return response.data;
  }), [run]);

  const getMemberCount = useCallback(async (appId: string) => run(async () => {
    const response = await apiGetAuth<ApiResponse<any[]>>(`/apps/${appId}/coowners`);
    return (response.data || []).filter((member) => member.status === 'accepted').length;
  }), [run]);

  return {
    getRole,
    getMembers,
    addMember,
    updateMemberRole,
    removeMember,
    getMemberCount,
    isLoading,
    error,
  };
};

function normalizeRole(role: string | null | undefined): AppRole['role'] {
  if (role === 'co_founder') return 'cofounder';
  if (role === 'owner' || role === 'cofounder' || role === 'shareholder' || role === 'prospective' || role === 'admin' || role === 'support') return role;
  return 'prospective';
}

function normalizeMemberStatus(status: string | null | undefined): AppRole['status'] {
  if (status === 'active' || status === 'pending' || status === 'removed') return status;
  if (status === 'accepted') return 'active';
  if (status === 'departed' || status === 'declined') return 'removed';
  return 'pending';
}

function buildAppRole(
  role: string,
  customPermissions?: Record<string, boolean> | null,
  status: AppRole['status'] = 'active',
): AppRole {
  const basePermissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.prospective;
  const permissions = { ...basePermissions, ...customPermissions };

  return {
    role: role as AppRole['role'],
    status,
    permissions,
    canAccess: (feature: string) => !!permissions[`view_${feature}`] || !!permissions[feature],
    canEdit: (feature: string) => !!permissions[`manage_${feature}`] || !!permissions[`upload_${feature}`],
    canDelete: (feature: string) => !!permissions[`delete_${feature}`] || !!permissions[`transfer_${feature}`],
  };
}
