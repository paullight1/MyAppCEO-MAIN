import { Listing, ApiResponse, ListingStatus } from '../../../../packages/types/src';
import { apiGet, apiGetAuth, apiPost, apiPatch, apiDelete, apiUpload, apiPostPublic } from '../lib/apiClient';
import { useApiRunner } from './useApiRunner';
import {
  MarketplacePayloadError,
  NormalizedListingPayload,
  assertValidListingPayload,
  normalizeListingPayload,
  readImageDimensions,
  serializeListingFilters,
  validateCoverImageDimensions,
  validateScreenshotFiles,
  type ListingFilterInput,
  type ListingPayloadIntent,
  type MarketplaceValidationError,
} from '../lib/marketplaceValidation';

type ListingMutationOptions = {
  intent?: ListingPayloadIntent;
};

type MediaUploadPurpose = 'cover_image' | 'screenshot' | 'revenue_evidence';

type MediaUploadOptions = {
  purpose?: MediaUploadPurpose;
  listingId?: string;
  path?: string;
  validateCover?: boolean;
};

type ListingHistoryItem = {
  id: string;
  listingId: string;
  actorId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type ListingReviewState = {
  listingId: string;
  status: ListingStatus | 'changes_requested';
  revenueEvidenceStatus?: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  notes?: string;
  updatedAt?: string;
};

type ListingReviewDecision = {
  action: 'approve' | 'reject' | 'request_changes';
  notes?: string;
  reason?: string;
};

type ListingViewResponse = {
  tracked: boolean;
  listingId: string;
};

const LISTING_VIEW_SESSION_PREFIX = 'mvplab_listing_viewed';

const normalizeAndValidate = (
  formData: Record<string, unknown>,
  intent: ListingPayloadIntent,
): NormalizedListingPayload => {
  const payload = normalizeListingPayload(formData);
  assertValidListingPayload(payload, intent);
  return payload;
};

const normalizeApiPayload = (payload: NormalizedListingPayload) => {
  const { termsAccepted, termsAcceptedAt, termsPolicyVersion, minimumOffer, ...listingPayload } = payload;
  const storeMetadata = {
    ...(listingPayload.storeMetadata ?? {}),
    ...(minimumOffer !== undefined ? { minimumOffer } : {}),
    ...(termsAccepted || termsAcceptedAt || termsPolicyVersion
      ? {
          termsAcceptance: {
            accepted: termsAccepted,
            acceptedAt: termsAcceptedAt,
            policyVersion: termsPolicyVersion,
          },
        }
      : {}),
  };

  return {
    ...listingPayload,
    ...(Object.keys(storeMetadata).length > 0 ? { storeMetadata } : {}),
  };
};

const getListingViewSessionKey = (listingId: string) => `${LISTING_VIEW_SESSION_PREFIX}:${listingId}`;

export const useMarketplace = () => {
  const { run, isLoading, error } = useApiRunner({ objectReturn: true });

  const createListing = (formData: Record<string, unknown>, options: ListingMutationOptions = {}) =>
    run(() =>
      apiPost<ApiResponse<Listing>>('/listings', normalizeApiPayload(normalizeAndValidate(formData, options.intent ?? 'draft'))),
    );

  const saveListingDraft = (formData: Record<string, unknown>, listingId?: string) =>
    run(async () => {
      const payload = normalizeApiPayload(normalizeAndValidate(formData, 'draft'));
      if (!listingId) {
        return apiPost<ApiResponse<Listing>>('/listings', payload);
      }

      const listing = await apiPatch<ApiResponse<Listing>>(`/listings/${listingId}`, payload);
      await apiPatch<ApiResponse<Listing>>(`/listings/${listingId}/status`, { status: 'draft' });
      return listing;
    });

  const getListings = (filters: ListingFilterInput = {}) =>
    run(() => {
      const qs = serializeListingFilters(filters).toString();
      return apiGet<ApiResponse<Listing[]>>(`/listings${qs ? `?${qs}` : ''}`);
    });

  const searchListings = (filters: ListingFilterInput = {}) =>
    run(() => {
      const qs = serializeListingFilters(filters).toString();
      return apiGet<ApiResponse<Listing[]>>(`/search/listings${qs ? `?${qs}` : ''}`);
    });

  const getListingById = (id: string) =>
    run(() => apiGet<ApiResponse<Listing>>(`/listings/${id}`));

  const getMyListings = () =>
    run(() => apiGetAuth<ApiResponse<Listing[]>>('/listings/me'));

  const updateListing = (id: string, formData: Record<string, unknown>, options: ListingMutationOptions = {}) =>
    run(() =>
      apiPatch<ApiResponse<Listing>>(`/listings/${id}`, normalizeApiPayload(normalizeAndValidate(formData, options.intent ?? 'update'))),
    );

  const deleteListing = (id: string) =>
    run(() => apiDelete<ApiResponse<{ id: string }>>(`/listings/${id}`));

  const updateListingStatus = (id: string, status: ListingStatus) =>
    run(() => apiPatch<ApiResponse<Listing>>(`/listings/${id}/status`, { status }));

  const submitListingForReview = (id: string, formData?: Record<string, unknown>) =>
    run(async () => {
      if (formData) {
        const payload = normalizeApiPayload(normalizeAndValidate(formData, 'submit'));
        await apiPatch<ApiResponse<Listing>>(`/listings/${id}`, payload);
      }

      return apiPatch<ApiResponse<Listing>>(`/listings/${id}/status`, { status: 'pending_review' });
    });

  const getListingReview = (id: string) =>
    run(() => apiGetAuth<ApiResponse<ListingReviewState>>(`/listings/${id}/review`));

  const reviewListing = (id: string, decision: ListingReviewDecision) =>
    run(() => apiPost<ApiResponse<ListingReviewState>>(`/listings/${id}/review`, decision));

  const getListingHistory = (id: string) =>
    run(() => apiGetAuth<ApiResponse<ListingHistoryItem[]>>(`/listings/${id}/history`));

  const trackListingViewOnce = (id: string) =>
    run(async () => {
      if (typeof window !== 'undefined') {
        const key = getListingViewSessionKey(id);
        if (sessionStorage.getItem(key)) {
          return { success: true, data: { tracked: false, listingId: id } } as ApiResponse<ListingViewResponse>;
        }
        sessionStorage.setItem(key, '1');
      }

      return apiPostPublic<ApiResponse<ListingViewResponse>>(`/listings/${id}/views`, {
        trackedAt: new Date().toISOString(),
      });
    });

  const uploadImage = async (file: File, options: MediaUploadOptions = {}) => {
    if (options.validateCover || options.purpose === 'cover_image') {
      const dimensions = await readImageDimensions(file);
      const validationErrors = validateCoverImageDimensions(dimensions);
      if (validationErrors.length > 0) {
        throw new MarketplacePayloadError(validationErrors);
      }
    }

    const form = new FormData();
    form.append('file', file);
    if (options.purpose) form.append('purpose', options.purpose);
    if (options.listingId) form.append('listingId', options.listingId);
    if (options.path) form.append('path', options.path);
    return run(() => apiUpload<ApiResponse<{ url: string; publicId: string }>>('/media/upload', form));
  };

  const uploadCoverImage = (file: File, listingId?: string) =>
    uploadImage(file, { purpose: 'cover_image', listingId, path: listingId ? `listings/${listingId}/cover` : 'listings/drafts/cover', validateCover: true });

  const uploadScreenshots = (files: File[] | FileList, listingId?: string) => {
    validateScreenshotFiles(files);
    const screenshotFiles = Array.from(files);
    return run(async () =>
      Promise.all(
        screenshotFiles.map((file) => {
          const form = new FormData();
          form.append('file', file);
          form.append('purpose', 'screenshot');
          form.append('path', listingId ? `listings/${listingId}/screenshots` : 'listings/drafts/screenshots');
          if (listingId) form.append('listingId', listingId);
          return apiUpload<ApiResponse<{ url: string; publicId: string }>>('/media/upload', form);
        }),
      ),
    );
  };

  const uploadRevenueEvidence = (file: File, listingId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'revenue_evidence');
    form.append('listingId', listingId);
    form.append('path', `listings/${listingId}/private/revenue-evidence`);
    return run(() => apiUpload<ApiResponse<{ url: string; publicId: string }>>('/media/upload', form));
  };

  const validateListing = (formData: Record<string, unknown>, intent: ListingPayloadIntent = 'draft'): MarketplaceValidationError[] => {
    const payload = normalizeListingPayload(formData);
    try {
      assertValidListingPayload(payload, intent);
      return [];
    } catch (validationError) {
      if (validationError instanceof MarketplacePayloadError) {
        return validationError.errors;
      }
      throw validationError;
    }
  };

  return {
    createListing,
    saveListingDraft,
    getListings,
    searchListings,
    getListingById,
    getMyListings,
    updateListing,
    deleteListing,
    updateListingStatus,
    submitListingForReview,
    getListingReview,
    reviewListing,
    getListingHistory,
    trackListingViewOnce,
    uploadImage,
    uploadCoverImage,
    uploadScreenshots,
    uploadRevenueEvidence,
    validateListing,
    isLoading,
    error,
  };
};
