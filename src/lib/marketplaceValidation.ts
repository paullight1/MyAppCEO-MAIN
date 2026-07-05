import type { ListingType } from '../../../../packages/types/src';

export const MAX_LISTING_SCREENSHOTS = 8;
export const COVER_IMAGE_MIN_WIDTH = 1200;
export const COVER_IMAGE_MIN_HEIGHT = 675;
export const COVER_IMAGE_ASPECT_RATIO = 16 / 9;
export const COVER_IMAGE_ASPECT_RATIO_TOLERANCE = 0.08;

export type ListingPayloadIntent = 'draft' | 'update' | 'submit';

export interface MarketplaceValidationError {
  field: string;
  message: string;
}

export class MarketplacePayloadError extends Error {
  errors: MarketplaceValidationError[];

  constructor(errors: MarketplaceValidationError[]) {
    super(errors.map((error) => `${error.field}: ${error.message}`).join('; '));
    this.name = 'MarketplacePayloadError';
    this.errors = errors;
  }
}

export interface NormalizedListingPayload {
  appId?: string;
  name?: string;
  shortDescription?: string;
  longDescription?: string;
  category?: string;
  imageUrl?: string;
  screenshots?: string[];
  demoVideoUrl?: string;
  techStack?: string[];
  repositoryUrl?: string;
  documentationUrl?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  storeMetadata?: Record<string, unknown>;
  askingPrice?: number;
  minimumOffer?: number;
  monthlyRevenue?: number;
  totalUsers?: number;
  ageMonths?: number;
  revenueVerified?: boolean;
  listingType?: ListingType;
  targetRaise?: number;
  equityAvailable?: number;
  trafficMetrics?: Record<string, unknown>;
  unitEconomics?: Record<string, unknown>;
  handoverReadiness?: Record<string, unknown>;
  termsAccepted?: boolean;
  termsPolicyVersion?: string;
  termsAcceptedAt?: string;
}

export interface ListingFilterInput {
  category?: string | string[];
  listingType?: ListingType | ListingType[];
  minPrice?: string | number;
  maxPrice?: string | number;
  price?: { min?: string | number; max?: string | number };
  minRevenue?: string | number;
  maxRevenue?: string | number;
  revenue?: { min?: string | number; max?: string | number };
  risk?: string | string[];
  verifiedRevenue?: boolean | string;
  revenueVerified?: boolean | string;
  minAgeMonths?: string | number;
  maxAgeMonths?: string | number;
  age?: { min?: string | number; max?: string | number };
  sort?: string;
  q?: string;
  search?: string;
  page?: string | number;
  limit?: string | number;
  offset?: string | number;
  status?: string;
}

export interface CoverImageDimensions {
  width: number;
  height: number;
}

export interface CoverImageValidationOptions {
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number;
  aspectRatioTolerance?: number;
}

const APP_CATEGORIES = new Set([
  'ai tool',
  'analytics',
  'automation',
  'business',
  'content',
  'developer tools',
  'ecommerce',
  'education',
  'finance',
  'game',
  'health',
  'marketplace',
  'mobile app',
  'productivity',
  'saas',
  'social',
  'utility',
]);

const APP_STORE_HOSTS = ['apps.apple.com', 'itunes.apple.com'];
const PLAY_STORE_HOSTS = ['play.google.com'];

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const trimString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalUrl = (value: unknown): string | undefined => {
  const trimmed = trimString(value);
  return trimmed || undefined;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = value.map(trimString).filter(Boolean) as string[];
    return normalized.length > 0 ? normalized : undefined;
  }

  if (typeof value === 'string') {
    const normalized = value.split(',').map(trimString).filter(Boolean) as string[];
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
};

const normalizeMetricObject = (value: Record<string, unknown> | undefined) => {
  if (!value) return undefined;

  const normalized = Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, typeof item === 'boolean' ? item : toNumber(item) ?? trimString(item) ?? item])
      .filter(([, item]) => item !== undefined && item !== ''),
  );

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const isValidUrl = (value: string | undefined): boolean => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const hasAllowedHost = (value: string | undefined, allowedHosts: string[]): boolean => {
  if (!value) return true;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
  } catch {
    return false;
  }
};

const addNumberError = (
  errors: MarketplaceValidationError[],
  payload: NormalizedListingPayload,
  field: keyof NormalizedListingPayload,
  label: string,
  options: { required?: boolean; min?: number; max?: number } = {},
) => {
  const value = payload[field];
  if (value === undefined || value === null) {
    if (options.required) errors.push({ field, message: `${label} is required` });
    return;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push({ field, message: `${label} must be a valid number` });
    return;
  }

  if (options.min !== undefined && value < options.min) {
    errors.push({ field, message: `${label} must be at least ${options.min}` });
  }
  if (options.max !== undefined && value > options.max) {
    errors.push({ field, message: `${label} must be no more than ${options.max}` });
  }
};

export const normalizeListingPayload = (formData: Record<string, unknown>): NormalizedListingPayload => {
  const longDescription = trimString(formData.longDescription) || trimString(formData.description) || '';
  const shortDescription =
    trimString(formData.shortDescription) ||
    (longDescription ? `${longDescription.replace(/\s+/g, ' ').trim().slice(0, 157)}${longDescription.length > 157 ? '...' : ''}` : undefined);
  const listingType = trimString(formData.listingType) as ListingType | undefined;
  const termsAccepted = Boolean(formData.termsAccepted || formData.acceptedTerms || formData.marketplaceTermsAccepted);

  return {
    appId: trimString(formData.appId),
    name: trimString(formData.name),
    shortDescription,
    longDescription: longDescription || undefined,
    category: trimString(formData.category),
    imageUrl: optionalUrl(formData.imageUrl),
    screenshots: normalizeStringArray(formData.screenshots),
    demoVideoUrl: optionalUrl(formData.demoVideoUrl),
    techStack: normalizeStringArray(formData.techStack),
    repositoryUrl: optionalUrl(formData.repositoryUrl),
    documentationUrl: optionalUrl(formData.documentationUrl),
    appStoreUrl: optionalUrl(formData.appStoreUrl),
    playStoreUrl: optionalUrl(formData.playStoreUrl),
    storeMetadata: typeof formData.storeMetadata === 'object' && formData.storeMetadata !== null ? formData.storeMetadata as Record<string, unknown> : undefined,
    askingPrice: toNumber(formData.askingPrice),
    minimumOffer: toNumber(formData.minimumOffer ?? formData.minOffer),
    monthlyRevenue: toNumber(formData.monthlyRevenue),
    totalUsers: toNumber(formData.totalUsers),
    ageMonths: toNumber(formData.ageMonths),
    revenueVerified: typeof formData.revenueVerified === 'boolean' ? formData.revenueVerified : undefined,
    listingType,
    targetRaise: toNumber(formData.targetRaise),
    equityAvailable: toNumber(formData.equityAvailable),
    trafficMetrics: normalizeMetricObject(formData.trafficMetrics as Record<string, unknown> | undefined),
    unitEconomics: normalizeMetricObject(formData.unitEconomics as Record<string, unknown> | undefined),
    handoverReadiness: normalizeMetricObject(formData.handoverReadiness as Record<string, unknown> | undefined),
    termsAccepted,
    termsPolicyVersion: trimString(formData.termsPolicyVersion),
    termsAcceptedAt: trimString(formData.termsAcceptedAt),
  };
};

export const validateListingPayload = (
  payload: NormalizedListingPayload,
  intent: ListingPayloadIntent = 'draft',
): MarketplaceValidationError[] => {
  const errors: MarketplaceValidationError[] = [];
  const requiresCompletePayload = intent === 'submit';
  const saleListing = payload.listingType === 'sale' || payload.listingType === 'both';
  const investmentListing = payload.listingType === 'investment' || payload.listingType === 'both';

  if (requiresCompletePayload || payload.category) {
    if (!payload.category) {
      errors.push({ field: 'category', message: 'Category is required' });
    } else if (!APP_CATEGORIES.has(payload.category.toLowerCase())) {
      errors.push({ field: 'category', message: 'Category is not supported for marketplace listings' });
    }
  }

  if (requiresCompletePayload || payload.listingType) {
    if (!payload.listingType) {
      errors.push({ field: 'listingType', message: 'Listing type is required' });
    } else if (!['sale', 'investment', 'both'].includes(payload.listingType)) {
      errors.push({ field: 'listingType', message: 'Listing type must be sale, investment, or both' });
    }
  }

  if (requiresCompletePayload && saleListing) {
    addNumberError(errors, payload, 'askingPrice', 'Asking price', { required: true, min: 1 });
  } else if (payload.askingPrice !== undefined) {
    addNumberError(errors, payload, 'askingPrice', 'Asking price', { min: 0 });
  }

  addNumberError(errors, payload, 'minimumOffer', 'Minimum offer', { min: 0 });
  addNumberError(errors, payload, 'monthlyRevenue', 'Monthly revenue', { min: 0 });
  addNumberError(errors, payload, 'totalUsers', 'Total users', { min: 0 });
  addNumberError(errors, payload, 'ageMonths', 'App age', { min: 0 });

  if (payload.minimumOffer !== undefined && payload.askingPrice !== undefined && payload.minimumOffer > payload.askingPrice) {
    errors.push({ field: 'minimumOffer', message: 'Minimum offer cannot exceed asking price' });
  }

  if (requiresCompletePayload && investmentListing) {
    addNumberError(errors, payload, 'targetRaise', 'Target raise', { required: true, min: 1 });
    addNumberError(errors, payload, 'equityAvailable', 'Equity available', { required: true, min: 0.01, max: 100 });
  } else {
    addNumberError(errors, payload, 'targetRaise', 'Target raise', { min: 0 });
    addNumberError(errors, payload, 'equityAvailable', 'Equity available', { min: 0, max: 100 });
  }

  if (payload.targetRaise !== undefined && payload.askingPrice !== undefined && payload.listingType === 'investment' && payload.askingPrice > 0) {
    errors.push({ field: 'askingPrice', message: 'Investment-only listings should not include an asking price' });
  }

  const urlFields: Array<[keyof NormalizedListingPayload, string]> = [
    ['imageUrl', 'Cover image URL'],
    ['demoVideoUrl', 'Demo video URL'],
    ['repositoryUrl', 'Repository URL'],
    ['documentationUrl', 'Documentation URL'],
    ['appStoreUrl', 'App Store URL'],
    ['playStoreUrl', 'Play Store URL'],
  ];

  urlFields.forEach(([field, label]) => {
    const value = payload[field];
    if (typeof value === 'string' && !isValidUrl(value)) {
      errors.push({ field, message: `${label} must be a valid http(s) URL` });
    }
  });

  if (!hasAllowedHost(payload.appStoreUrl, APP_STORE_HOSTS)) {
    errors.push({ field: 'appStoreUrl', message: 'App Store URL must be an Apple App Store URL' });
  }
  if (!hasAllowedHost(payload.playStoreUrl, PLAY_STORE_HOSTS)) {
    errors.push({ field: 'playStoreUrl', message: 'Play Store URL must be a Google Play URL' });
  }

  if (payload.screenshots && payload.screenshots.length > MAX_LISTING_SCREENSHOTS) {
    errors.push({ field: 'screenshots', message: `Upload no more than ${MAX_LISTING_SCREENSHOTS} screenshots` });
  }

  if (payload.trafficMetrics) {
    Object.entries(payload.trafficMetrics).forEach(([key, value]) => {
      if (typeof value === 'number' && value < 0) {
        errors.push({ field: `trafficMetrics.${key}`, message: 'Traffic metrics cannot be negative' });
      }
    });
  }

  if (payload.unitEconomics) {
    Object.entries(payload.unitEconomics).forEach(([key, value]) => {
      if (typeof value === 'number' && value < 0) {
        errors.push({ field: `unitEconomics.${key}`, message: 'Financial metrics cannot be negative' });
      }
    });
  }

  if (intent === 'submit' && !payload.termsAccepted) {
    errors.push({ field: 'termsAccepted', message: 'Marketplace terms must be accepted before review submission' });
  }

  return errors;
};

export const assertValidListingPayload = (
  payload: NormalizedListingPayload,
  intent: ListingPayloadIntent = 'draft',
) => {
  const errors = validateListingPayload(payload, intent);
  if (errors.length > 0) {
    throw new MarketplacePayloadError(errors);
  }
};

export const serializeListingFilters = (filters: ListingFilterInput = {}) => {
  const params = new URLSearchParams();
  const source = filters as Record<string, unknown>;

  const appendValue = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      const joined = value.map(String).map((item) => item.trim()).filter(Boolean).join(',');
      if (joined) params.set(key, joined);
      return;
    }
    params.set(key, String(value));
  };

  appendValue('category', filters.category);
  appendValue('listingType', filters.listingType);
  appendValue('minPrice', filters.price?.min ?? filters.minPrice);
  appendValue('maxPrice', filters.price?.max ?? filters.maxPrice);
  appendValue('minRevenue', filters.revenue?.min ?? filters.minRevenue);
  appendValue('maxRevenue', filters.revenue?.max ?? filters.maxRevenue);
  appendValue('risk', filters.risk);
  appendValue('verifiedRevenue', filters.verifiedRevenue ?? filters.revenueVerified);
  appendValue('minAgeMonths', filters.age?.min ?? filters.minAgeMonths);
  appendValue('maxAgeMonths', filters.age?.max ?? filters.maxAgeMonths);
  appendValue('sort', filters.sort);
  appendValue('q', filters.q ?? filters.search);
  appendValue('page', filters.page);
  appendValue('limit', filters.limit);
  appendValue('offset', filters.offset);
  appendValue('status', filters.status);

  Object.entries(source).forEach(([key, value]) => {
    if (!hasOwn(Object.fromEntries(params.entries()), key) && !['price', 'revenue', 'age', 'search', 'revenueVerified'].includes(key)) {
      appendValue(key, value);
    }
  });

  return params;
};

export const validateCoverImageDimensions = (
  dimensions: CoverImageDimensions,
  options: CoverImageValidationOptions = {},
): MarketplaceValidationError[] => {
  const minWidth = options.minWidth ?? COVER_IMAGE_MIN_WIDTH;
  const minHeight = options.minHeight ?? COVER_IMAGE_MIN_HEIGHT;
  const aspectRatio = options.aspectRatio ?? COVER_IMAGE_ASPECT_RATIO;
  const tolerance = options.aspectRatioTolerance ?? COVER_IMAGE_ASPECT_RATIO_TOLERANCE;
  const errors: MarketplaceValidationError[] = [];

  if (dimensions.width < minWidth || dimensions.height < minHeight) {
    errors.push({
      field: 'imageUrl',
      message: `Cover image must be at least ${minWidth}x${minHeight}`,
    });
  }

  const actualRatio = dimensions.width / dimensions.height;
  if (Math.abs(actualRatio - aspectRatio) > tolerance) {
    errors.push({
      field: 'imageUrl',
      message: 'Cover image must use a 16:9 aspect ratio',
    });
  }

  return errors;
};

export const validateScreenshotFiles = (files: File[] | FileList) => {
  const screenshotFiles = Array.from(files);
  if (screenshotFiles.length > MAX_LISTING_SCREENSHOTS) {
    throw new MarketplacePayloadError([
      { field: 'screenshots', message: `Upload no more than ${MAX_LISTING_SCREENSHOTS} screenshots` },
    ]);
  }
};

export const readImageDimensions = (file: File): Promise<CoverImageDimensions> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read image dimensions'));
    };
    image.src = objectUrl;
  });
