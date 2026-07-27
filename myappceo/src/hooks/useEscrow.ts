import { ApiResponse } from '../../../packages/types/src';
import { apiGetAuth, apiPost, apiPatch } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';

export interface EscrowDeal {
  id: string;
  listingId: string;
  listingName: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status:
    | 'created'
    | 'funding'
    | 'funded'
    | 'inspection'
    | 'approval'
    | 'releasing'
    | 'completed'
    | 'refunded'
    | 'disputed'
    | 'held';
  fundingStatus?: 'unfunded' | 'payment_intent_created' | 'processing' | 'funded' | 'failed' | 'refunded';
  providerStatus?: string;
  paymentIntentId?: string;
  inspectionEndsAt?: string;
  adminHold?: boolean;
  stage: number;
  timeLeft?: string;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowMilestone {
  id: string;
  dealId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'disputed';
  completedAt?: string;
  completedBy?: string;
}

export interface TransferItem {
  id: string;
  dealId: string;
  type: 'source_code' | 'domain' | 'social_accounts' | 'customer_data' | 'documentation' | 'hosting';
  label: string;
  description?: string;
  required?: boolean;
  status?: 'pending' | 'seller_ready' | 'buyer_confirmed' | 'completed' | 'disputed';
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
  confirmedAt?: string;
  evidenceUrl?: string;
  notes?: string;
}

export interface EscrowPaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface EscrowDisputePayload {
  reason: string;
  evidence?: Array<{
    type: 'url' | 'text' | 'file';
    value: string;
    label?: string;
  }>;
  requestedResolution?: 'release' | 'refund' | 'partial_refund' | 'manual_review';
}

export interface TransferChecklistPayload {
  items: Array<{
    type: TransferItem['type'];
    label: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface EscrowActionOptions {
  idempotencyKey?: string;
  note?: string;
}

const createIdempotencyKey = (scope: string) => {
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${randomPart}`;
};

const withIdempotency = <T extends Record<string, unknown>>(
  payload: T,
  scope: string,
  idempotencyKey?: string,
) => ({
  ...payload,
  idempotencyKey: idempotencyKey || createIdempotencyKey(scope),
});

const normalizeDisputePayload = (
  reasonOrPayload: string | EscrowDisputePayload,
): EscrowDisputePayload => {
  if (typeof reasonOrPayload === 'string') {
    return { reason: reasonOrPayload };
  }
  return {
    ...reasonOrPayload,
    reason: reasonOrPayload.reason.trim(),
  };
};

export interface EscrowStats {
  totalValue: number;
  activeDeals: number;
  completedDeals: number;
}

export const useEscrow = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const getMyEscrowDeals = () =>
    run(() => apiGetAuth<ApiResponse<EscrowDeal[]>>('/escrow'));

  const getEscrowDeal = (dealId: string) =>
    run(() => apiGetAuth<ApiResponse<EscrowDeal>>(`/escrow/${dealId}`));

  const createEscrow = (offerId: string, options: EscrowActionOptions = {}) =>
    run(() =>
      apiPost<ApiResponse<EscrowDeal>>(
        '/escrow',
        withIdempotency({ offerId }, 'escrow:create', options.idempotencyKey),
      ),
    );

  const getFundingStatus = (dealId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<Pick<EscrowDeal, 'id' | 'fundingStatus' | 'providerStatus' | 'paymentIntentId'>>>(
        `/escrow/${dealId}/funding`,
      ),
    );

  const createPaymentIntent = (
    dealId: string,
    options: EscrowActionOptions & { returnUrl?: string } = {},
  ) =>
    run(() =>
      apiPost<ApiResponse<EscrowPaymentIntent>>(
        `/escrow/${dealId}/payment-intent`,
        withIdempotency(
          { returnUrl: options.returnUrl },
          'escrow:payment-intent',
          options.idempotencyKey,
        ),
      ),
    );

  const markFundingProcessing = (dealId: string, paymentIntentId: string) =>
    run(() =>
      apiPatch<ApiResponse<EscrowDeal>>(`/escrow/${dealId}/funding`, {
        fundingStatus: 'processing',
        paymentIntentId,
      }),
    );

  const getTransferItems = (dealId: string) =>
    run(() => apiGetAuth<ApiResponse<TransferItem[]>>(`/escrow/${dealId}/transfer-items`));

  const configureTransferChecklist = (
    dealId: string,
    payload: TransferChecklistPayload,
  ) =>
    run(() =>
      apiPost<ApiResponse<TransferItem[]>>(
        `/escrow/${dealId}/transfer-items`,
        payload,
      ),
    );

  const updateTransferItem = (
    dealId: string,
    itemId: string,
    updates: Partial<Pick<TransferItem, 'status' | 'evidenceUrl' | 'notes' | 'sellerConfirmed' | 'buyerConfirmed'>>,
  ) =>
    run(() =>
      apiPatch<ApiResponse<TransferItem>>(
        `/escrow/${dealId}/transfer-items/${itemId}`,
        updates,
      ),
    );

  const confirmTransferItem = (dealId: string, itemId: string, role: 'seller' | 'buyer') =>
    run(() =>
      apiPatch<ApiResponse<TransferItem>>(`/escrow/${dealId}/transfer-items/${itemId}/confirm`, { role })
    );

  const getMilestones = (dealId: string) =>
    run(() => apiGetAuth<ApiResponse<EscrowMilestone[]>>(`/escrow/${dealId}/milestones`));

  const updateMilestone = (
    dealId: string,
    milestoneId: string,
    status: EscrowMilestone['status'],
    options: EscrowActionOptions = {},
  ) =>
    run(() =>
      apiPatch<ApiResponse<EscrowMilestone>>(
        `/escrow/${dealId}/milestones/${milestoneId}`,
        {
          status,
          note: options.note,
        },
      )
    );

  const releaseFunds = (dealId: string, options: EscrowActionOptions = {}) =>
    run(() =>
      apiPost<ApiResponse<{ released: boolean; amount: number; providerStatus?: string }>>(
        `/escrow/${dealId}/release`,
        withIdempotency({ note: options.note }, 'escrow:release', options.idempotencyKey),
      ),
    );

  const refundFunds = (
    dealId: string,
    options: EscrowActionOptions & { amount?: number; reason?: string } = {},
  ) =>
    run(() =>
      apiPost<ApiResponse<{ refunded: boolean; amount: number; providerStatus?: string }>>(
        `/escrow/${dealId}/refund`,
        withIdempotency(
          { amount: options.amount, reason: options.reason, note: options.note },
          'escrow:refund',
          options.idempotencyKey,
        ),
      ),
    );

  const getProviderState = (dealId: string) =>
    run(() =>
      apiGetAuth<ApiResponse<{ provider: 'stripe' | string; status: string; raw?: unknown }>>(
        `/escrow/${dealId}/provider-state`,
      ),
    );

  const disputeDeal = (
    dealId: string,
    reasonOrPayload: string | EscrowDisputePayload,
  ) =>
    run(() =>
      apiPost<ApiResponse<EscrowDeal>>(
        `/escrow/${dealId}/dispute`,
        normalizeDisputePayload(reasonOrPayload),
      ),
    );

  const getEscrowStats = () =>
    run(() => apiGetAuth<ApiResponse<EscrowStats>>('/escrow/stats'));

  return {
    getMyEscrowDeals,
    getEscrowDeal,
    createEscrow,
    getFundingStatus,
    createPaymentIntent,
    markFundingProcessing,
    getTransferItems,
    configureTransferChecklist,
    updateTransferItem,
    confirmTransferItem,
    getMilestones,
    updateMilestone,
    releaseFunds,
    refundFunds,
    getProviderState,
    disputeDeal,
    getEscrowStats,
    isLoading,
    error,
  };
};
