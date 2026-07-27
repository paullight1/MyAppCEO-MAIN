import {
  ExternalStoreApp,
  StoreImportSnapshot,
  StorePlatform,
} from "../types/externalApp";

export interface ParsedStoreReference {
  platform: Exclude<StorePlatform, "all">;
  id: string;
}

export const parseStoreAppReference = (
  value: string,
): ParsedStoreReference | null => {
  const input = value.trim();
  if (!input) return null;

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();

    if (host.includes("apps.apple.com") || host.includes("itunes.apple.com")) {
      const idMatch = url.pathname.match(/\/id(\d+)/);
      return idMatch ? { platform: "ios", id: idMatch[1] } : null;
    }

    if (host.includes("play.google.com")) {
      const id = url.searchParams.get("id");
      return id ? { platform: "android", id } : null;
    }
  } catch {
    // Not a URL; continue with ID parsing.
  }

  if (/^\d{5,}$/.test(input)) {
    return { platform: "ios", id: input };
  }

  if (/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(input)) {
    return { platform: "android", id: input };
  }

  return null;
};

export const normalizeStoreCategory = (
  category?: string,
): "SaaS" | "AI Tool" | "Game" | "Mobile App" => {
  const value = (category || "").toLowerCase();
  if (value.includes("game")) return "Game";
  if (value.includes("ai") || value.includes("chatbot")) return "AI Tool";
  if (value.includes("business") || value.includes("productivity"))
    return "SaaS";
  return "Mobile App";
};

export const monthsSince = (date?: string): string => {
  if (!date) return "12";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "12";

  const now = new Date();
  const months =
    (now.getFullYear() - parsed.getFullYear()) * 12 +
    now.getMonth() -
    parsed.getMonth();
  return String(Math.max(1, months));
};

export const shortStoreDescription = (app: ExternalStoreApp): string => {
  const text = app.shortDescription || app.description || "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 170 ? `${clean.slice(0, 167).trim()}...` : clean;
};

export const getStoreIconUrl = (app: ExternalStoreApp): string =>
  app.iconUrl ||
  app.media?.icon?.url ||
  app.artworkUrl ||
  app.media?.artwork?.url ||
  "";

export const getStoreArtworkUrl = (app: ExternalStoreApp): string =>
  app.artworkUrl ||
  app.media?.artwork?.url ||
  app.iconUrl ||
  app.media?.icon?.url ||
  "";

export const getStoreScreenshotUrls = (app: ExternalStoreApp): string[] => {
  const mediaShots =
    app.media?.screenshots?.map((shot) => shot.url).filter(Boolean) ?? [];
  if (mediaShots.length > 0) return mediaShots;
  return app.screenshots?.filter(Boolean) || [];
};

export const toStoreProvider = (
  source: ExternalStoreApp["source"],
): StoreImportSnapshot["provider"] =>
  source === "google-play" ? "google_play" : "apple_app_store";

export const buildStoreImportSnapshot = (
  app: ExternalStoreApp,
): StoreImportSnapshot => {
  const screenshots = getStoreScreenshotUrls(app);
  const iconUrl = getStoreIconUrl(app);
  const artworkUrl = getStoreArtworkUrl(app);
  const shortDescription =
    shortStoreDescription(app) || app.description || app.name;

  return {
    source: app.source,
    platform: app.platform,
    provider: toStoreProvider(app.source),
    storeId: app.id,
    storeUrl: app.storeUrl,
    name: app.name,
    developer: app.developer,
    category: app.category,
    description: app.description,
    shortDescription,
    iconUrl,
    artworkUrl,
    screenshots,
    rating: app.rating,
    ratingCount: app.ratingCount,
    priceText: app.priceText,
    bundleId: app.bundleId,
    packageName: app.packageName,
    releaseDate: app.releaseDate,
    updatedAt: app.updatedAt,
    contentRating: app.contentRating,
    version: app.version,
    country: app.country,
    locale: app.locale,
    fetchedAt: app.fetchedAt,
    rawMetadata: app.rawMetadata || {},
    metadata: {
      source: app.source,
      provider: toStoreProvider(app.source),
      platform: app.platform,
      storeId: app.id,
      storeUrl: app.storeUrl,
      name: app.name,
      developer: app.developer,
      category: app.category,
      description: app.description,
      shortDescription,
      iconUrl,
      artworkUrl,
      screenshots,
      rating: app.rating,
      ratingCount: app.ratingCount,
      priceText: app.priceText,
      bundleId: app.bundleId,
      packageName: app.packageName,
      releaseDate: app.releaseDate,
      updatedAt: app.updatedAt,
      contentRating: app.contentRating,
      version: app.version,
      country: app.country,
      locale: app.locale,
      fetchedAt: app.fetchedAt,
      rawMetadata: app.rawMetadata || {},
    },
  };
};

export const storeSourceLabel = (app: ExternalStoreApp) =>
  app.source === "google-play" ? "Google Play" : "Apple App Store";
