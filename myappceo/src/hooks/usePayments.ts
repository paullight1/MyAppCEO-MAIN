import { ApiResponse } from '../../../packages/types/src';
import { apiGetAuth, apiPost } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface StripeConnectAccount {
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue?: string[];
  disabledReason?: string;
  dashboardUrl?: string;
}

export interface PayoutReadiness {
  listingId: string;
  ready: boolean;
  requiredBeforeActivation: boolean;
  blockers: string[];
  account?: StripeConnectAccount;
}

export interface RevenueVerificationResult {
  verified: boolean;
  revenue?: number;
  evidenceId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
  reviewerNote?: string;
}

export interface RevenueEvidenceInput {
  listingId: string;
  evidenceUrl?: string;
  provider?: 'stripe' | 'manual' | 'app_store' | 'play_store';
  notes?: string;
}

export interface StripeDispute {
  id: string;
  stripeDisputeId: string;
  stripeChargeId?: string | null;
  connectedAccountId?: string | null;
  appId?: string | null;
  amount: number;
  currency: string;
  reason?: string | null;
  status: string;
  evidenceDueBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StripeSubscription {
  id: string;
  stripeSubscriptionId: string;
  stripeCustomerId?: string | null;
  connectedAccountId?: string | null;
  appId?: string | null;
  status: string;
  priceId?: string | null;
  productId?: string | null;
  currency?: string | null;
  unitAmount?: number | null;
  interval?: string | null;
  intervalCount?: number | null;
  quantity?: number | null;
  mrrAmount: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionSummary {
  activeSubscriptions: number;
  byCurrency: {
    currency: string;
    totalMrrMinor: number;
    totalMrr: number;
    activeSubscriptions: number;
  }[];
}

interface StoredDataFilters {
  appId?: string;
  status?: string;
  // Index signature so the whole object is assignable to `toQuery`'s
  // Record<string, string | undefined> parameter (interfaces otherwise lack one).
  [key: string]: string | undefined;
}

const toQuery = (filters: Record<string, string | undefined>): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const usePayments = () => {
  const { run, isLoading, error } = useApiRunner();

  const connectStripe = (returnUrl?: string) =>
    run(() => apiPost<ApiResponse<{ url: string }>>('/payments/connect', { returnUrl }));

  const getStripeConnectStatus = () =>
    run(() => apiGetAuth<ApiResponse<StripeConnectAccount>>('/payments/connect/status'));

  const refreshStripeAccount = () =>
    run(() =>
      apiPost<ApiResponse<StripeConnectAccount>>('/payments/connect/refresh', {}),
    );

  const getPayoutReadiness = (listingId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<PayoutReadiness>>(
        `/payments/listings/${listingId}/payout-readiness`,
      ),
    );

  const verifyRevenue = (appId: string, stripeAccountId: string) =>
    run(() =>
      apiPost<ApiResponse<RevenueVerificationResult>>(
        '/payments/verify-revenue',
        { appId, stripeAccountId },
      ),
    );

  const submitRevenueEvidence = (input: RevenueEvidenceInput) =>
    run(() =>
      apiPost<ApiResponse<RevenueVerificationResult>>(
        `/payments/listings/${input.listingId}/revenue-evidence`,
        {
          evidenceUrl: input.evidenceUrl,
          provider: input.provider || 'manual',
          notes: input.notes,
        },
      ),
    );

  const getRevenueVerification = (listingId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<RevenueVerificationResult>>(
        `/payments/listings/${listingId}/revenue-verification`,
      ),
    );

  const getDisputes = (filters: StoredDataFilters = {}) =>
    run(() =>
      apiGetAuth<ApiResponse<StripeDispute[]>>(
        `/payments/disputes${toQuery(filters)}`,
      ),
    );

  const getSubscriptions = (filters: StoredDataFilters = {}) =>
    run(() =>
      apiGetAuth<ApiResponse<StripeSubscription[]>>(
        `/payments/subscriptions${toQuery(filters)}`,
      ),
    );

  const getSubscriptionSummary = (appId?: string) =>
    run(() =>
      apiGetAuth<ApiResponse<SubscriptionSummary>>(
        `/payments/subscriptions/summary${toQuery({ appId })}`,
      ),
    );

  return {
    connectStripe,
    getStripeConnectStatus,
    refreshStripeAccount,
    getPayoutReadiness,
    verifyRevenue,
    submitRevenueEvidence,
    getRevenueVerification,
    getDisputes,
    getSubscriptions,
    getSubscriptionSummary,
    isLoading,
    error,
  };
};
