import { useState, useEffect, useCallback } from 'react';
import { UserRole } from '../../../packages/types/src';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { getIsAdminUser } from '../utils/adminRoles';

export type AccountStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted';
export type ProfileMissingField = 'fullName' | 'role' | 'avatarUrl';

interface UserProfileRow {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: UserRole | string | null;
  account_status?: AccountStatus | string | null;
  status?: AccountStatus | string | null;
  kyc_status?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
  company_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserStatusProfile {
  id: string;
  email: string;
  role: UserRole | null;
  fullName: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  accountStatus: AccountStatus;
  kycStatus: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileCompletion {
  isComplete: boolean;
  missingFields: ProfileMissingField[];
}

const ACCOUNT_STATUSES: AccountStatus[] = ['active', 'suspended', 'pending_verification', 'deleted'];

const normalizeAccountStatus = (status: unknown): AccountStatus => {
  return typeof status === 'string' && ACCOUNT_STATUSES.includes(status as AccountStatus)
    ? (status as AccountStatus)
    : 'active';
};

const hasValue = (value: string | null | undefined): boolean => Boolean(value?.trim());

const mapProfile = (row: UserProfileRow | null, authEmail: string): UserStatusProfile | null => {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email || authEmail,
    role: (row.role as UserRole | null) ?? null,
    fullName: row.full_name ?? null,
    companyName: row.company_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    accountStatus: normalizeAccountStatus(row.account_status ?? row.status),
    kycStatus: row.kyc_status ?? null,
    stripeAccountId: row.stripe_account_id ?? null,
    stripeOnboardingComplete: Boolean(row.stripe_onboarding_complete),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
};

const getProfileCompletion = (profile: UserStatusProfile | null): ProfileCompletion => {
  const missingFields: ProfileMissingField[] = [];
  if (!hasValue(profile?.fullName)) missingFields.push('fullName');
  if (!hasValue(profile?.role)) missingFields.push('role');
  if (!hasValue(profile?.avatarUrl)) missingFields.push('avatarUrl');

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
};

export const useUserStatus = () => {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<UserStatusProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!session?.access_token || !user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle<UserProfileRow>();

      if (profileError) throw profileError;

      setProfile(mapProfile(data, user.email ?? ''));
    } catch (err: unknown) {
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const profileCompletion = getProfileCompletion(profile);
  const accountStatus = profile?.accountStatus ?? 'active';
  const isVerified = profile?.kycStatus === 'approved' && profile.stripeOnboardingComplete;
  const isAdmin = getIsAdminUser(user, profile?.role);
  const isSuspended = accountStatus === 'suspended';
  const isDeleted = accountStatus === 'deleted';
  const isPendingVerification = accountStatus === 'pending_verification';

  return {
    profile,
    accountStatus,
    profileCompletion,
    isVerified,
    isAdmin,
    isSuspended,
    isDeleted,
    isPendingVerification,
    isLoading,
    error,
    refetch: fetchProfile,
  };
};
