import { ApiResponse } from '../../../../packages/types/src';
import { apiGetAuth, apiPost, apiPatch } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';
import { useState } from 'react';

export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'countered';

export type MarketplaceErrorCode =
  | 'validation'
  | 'authorization'
  | 'conflict'
  | 'payment_required'
  | 'provider_unavailable'
  | 'retryable'
  | 'unknown';

export interface MarketplaceApiError {
  code: MarketplaceErrorCode;
  message: string;
  field?: string;
  retryable?: boolean;
}

export interface DuplicateOfferConflict {
  existingOfferId?: string;
  existingStatus?: OfferStatus;
  listingId?: string;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  amount: any;
  message?: string;
  status: OfferStatus;
  counterAmount?: number;
  counterMessage?: string;
  counteredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type OfferApiResponse<T> = ApiResponse<T> & {
  error?: MarketplaceApiError;
  conflict?: DuplicateOfferConflict;
  message?: string;
};

export interface CreateOfferInput {
  listingId: string;
  amount: number;
  message?: string;
  idempotencyKey?: string;
}

export interface OfferActionOptions {
  message?: string;
  idempotencyKey?: string;
}

const MIN_OFFER_AMOUNT = 1;

const createIdempotencyKey = (scope: string) => {
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${randomPart}`;
};

const validationFailure = <T>(
  message: string,
  field?: string,
): OfferApiResponse<T> => ({
  success: false,
  data: null as T,
  message,
  error: {
    code: 'validation',
    message,
    field,
    retryable: false,
  },
});

const validateOfferAmount = (amount: number, field = 'amount') => {
  if (!Number.isFinite(amount)) {
    return validationFailure<Offer>('Enter a valid offer amount.', field);
  }
  if (amount < MIN_OFFER_AMOUNT) {
    return validationFailure<Offer>('Offer amount must be greater than $0.', field);
  }
  return null;
};

export const useOffers = () => {
  const { run, isLoading, error } = useApiRunner();
  const [localError, setLocalError] = useState<string | null>(null);

  /** Submit a new offer on a listing */
  const createOffer = (
    listingIdOrInput: string | CreateOfferInput,
    amount?: number,
    message?: string,
  ) => {
    const input =
      typeof listingIdOrInput === 'string'
        ? { listingId: listingIdOrInput, amount: amount ?? Number.NaN, message }
        : listingIdOrInput;
    const validation = validateOfferAmount(input.amount);
    if (validation) {
      setLocalError(validation.message || validation.error?.message || null);
      return Promise.resolve(validation);
    }
    setLocalError(null);

    const payload = {
      listingId: input.listingId,
      amount: input.amount,
      message: input.message?.trim() || undefined,
      idempotencyKey: input.idempotencyKey || createIdempotencyKey('offer:create'),
      duplicatePolicy: 'reject_active',
      clientContext: {
        source: 'marketplace_offer_modal',
      },
    };

    return run(() =>
      apiPost<OfferApiResponse<Offer>>('/offers', payload),
    );
  };

  /** Accept, reject, or withdraw an offer */
  const updateOfferStatus = (
    offerId: string,
    status: Extract<OfferStatus, 'accepted' | 'rejected' | 'withdrawn'>,
    options: OfferActionOptions = {},
  ) =>
    run(() =>
      apiPatch<OfferApiResponse<Offer>>(`/offers/${offerId}/status`, {
        status,
        message: options.message?.trim() || undefined,
        idempotencyKey:
          options.idempotencyKey || createIdempotencyKey(`offer:${status}`),
      }),
    );

  const acceptOffer = (offerId: string, options?: OfferActionOptions) =>
    updateOfferStatus(offerId, 'accepted', options);

  const rejectOffer = (offerId: string, options?: OfferActionOptions) =>
    updateOfferStatus(offerId, 'rejected', options);

  const withdrawOffer = (offerId: string, options?: OfferActionOptions) =>
    updateOfferStatus(offerId, 'withdrawn', options);

  /** Submit a counter-offer */
  const counterOffer = (
    offerId: string,
    amount: number,
    message?: string,
    options: OfferActionOptions = {},
  ) => {
    const validation = validateOfferAmount(amount, 'counterAmount');
    if (validation) {
      setLocalError(validation.message || validation.error?.message || null);
      return Promise.resolve(validation);
    }
    setLocalError(null);

    return run(() =>
      apiPost<OfferApiResponse<Offer>>(`/offers/${offerId}/counter`, {
        amount,
        message: message?.trim() || undefined,
        idempotencyKey:
          options.idempotencyKey || createIdempotencyKey('offer:counter'),
      }),
    );
  };

  /** Buyer response to a seller counter-offer when supported by the backend. */
  const respondToCounterOffer = (
    offerId: string,
    response: 'accepted' | 'rejected',
    options: OfferActionOptions = {},
  ) =>
    run(() =>
      apiPost<OfferApiResponse<Offer>>(`/offers/${offerId}/counter/respond`, {
        response,
        message: options.message?.trim() || undefined,
        idempotencyKey:
          options.idempotencyKey || createIdempotencyKey(`offer:counter:${response}`),
      }),
    );

  /** Get all offers on a listing the authenticated user owns */
  const getOffersForListing = (listingId: string) =>
    run(() => apiGetAuth<OfferApiResponse<Offer[]>>(`/offers/listing/${listingId}`));

  /** Get all offers the authenticated user has sent */
  const getMySentOffers = () =>
    run(() => apiGetAuth<OfferApiResponse<Offer[]>>('/offers/sent'));

  /** Get all offers received by the authenticated seller. */
  const getMyReceivedOffers = () =>
    run(() => apiGetAuth<OfferApiResponse<Offer[]>>('/offers/received'));

  return {
    createOffer,
    updateOfferStatus,
    acceptOffer,
    rejectOffer,
    withdrawOffer,
    counterOffer,
    respondToCounterOffer,
    getOffersForListing,
    getMySentOffers,
    getMyReceivedOffers,
    isLoading,
    error: localError || error,
  };
};
