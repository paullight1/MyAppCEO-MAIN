export type StorePlatform = "ios" | "android" | "all";

export interface ExternalStoreMediaAsset {
  url: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  locale?: string;
  device?: string;
  title?: string;
}

export interface ExternalStoreMediaBundle {
  icon?: ExternalStoreMediaAsset;
  artwork?: ExternalStoreMediaAsset;
  screenshots?: ExternalStoreMediaAsset[];
}

export interface ExternalStoreApp {
  id: string;
  platform: Exclude<StorePlatform, "all">;
  source: "apple-app-store" | "google-play";
  country?: string;
  locale?: string;
  fetchedAt?: string;
  name: string;
  developer: string;
  category: string;
  description: string;
  shortDescription?: string;
  iconUrl: string;
  artworkUrl: string;
  screenshots: string[];
  rating?: number;
  ratingCount?: number;
  priceText: string;
  storeUrl: string;
  bundleId?: string;
  packageName?: string;
  releaseDate?: string;
  updatedAt?: string;
  contentRating?: string;
  version?: string;
  rawMetadata?: Record<string, unknown>;
  media?: ExternalStoreMediaBundle;
}

export interface StoreImportSnapshot {
  source: ExternalStoreApp["source"];
  platform: ExternalStoreApp["platform"];
  provider: "apple_app_store" | "google_play";
  storeId: string;
  storeUrl: string;
  name: string;
  developer: string;
  category: string;
  description: string;
  shortDescription: string;
  iconUrl: string;
  artworkUrl: string;
  screenshots: string[];
  rating?: number;
  ratingCount?: number;
  priceText: string;
  bundleId?: string;
  packageName?: string;
  releaseDate?: string;
  updatedAt?: string;
  contentRating?: string;
  version?: string;
  country?: string;
  locale?: string;
  fetchedAt?: string;
  rawMetadata: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ExternalCatalogResponse {
  apps: ExternalStoreApp[];
  warnings: string[];
  meta: {
    country: string;
    platform: StorePlatform;
    queryTerms: string[];
    sources: string[];
  };
}
