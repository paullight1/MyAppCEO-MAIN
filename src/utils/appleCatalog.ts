import { ExternalStoreApp } from "../types/externalApp";

const ITUNES_API_BASE = "https://itunes.apple.com";

export const mapItunesResult = (
  item: Record<string, any>,
  fallbackId = "",
): ExternalStoreApp => {
  const id = String(item.trackId || fallbackId);

  return {
    id,
    platform: "ios",
    source: "apple-app-store",
    country: "US",
    fetchedAt: new Date().toISOString(),
    name: item.trackName || "iOS App",
    developer: item.artistName || item.sellerName || "Unknown developer",
    category: item.primaryGenreName || "Mobile App",
    description: item.description || "",
    shortDescription: item.description || "",
    iconUrl: item.artworkUrl100 || item.artworkUrl60 || "",
    artworkUrl: item.artworkUrl512 || item.artworkUrl100 || "",
    screenshots: item.screenshotUrls || [],
    rating: item.averageUserRating,
    ratingCount: item.userRatingCount,
    priceText: item.formattedPrice || "Free",
    storeUrl: item.trackViewUrl || `https://apps.apple.com/app/id${id}`,
    bundleId: item.bundleId,
    releaseDate: item.releaseDate,
    updatedAt: item.currentVersionReleaseDate,
    contentRating: item.contentAdvisoryRating,
    version: item.version,
    rawMetadata: item,
    media: {
      icon: {
        url: item.artworkUrl100 || item.artworkUrl60 || "",
        sourceUrl: item.artworkUrl100 || item.artworkUrl60 || "",
        title: item.trackName || "App icon",
      },
      artwork: {
        url: item.artworkUrl512 || item.artworkUrl100 || "",
        sourceUrl: item.artworkUrl512 || item.artworkUrl100 || "",
        title: item.trackName || "App artwork",
      },
      screenshots: (item.screenshotUrls || []).map((url: string) => ({
        url,
        sourceUrl: url,
        title: `${item.trackName || "App"} screenshot`,
      })),
    },
  };
};

export const lookupAppleApp = async (
  id: string,
  country = "US",
): Promise<ExternalStoreApp | null> => {
  const response = await fetch(
    `${ITUNES_API_BASE}/lookup?id=${encodeURIComponent(id)}&country=${encodeURIComponent(country)}`,
  );
  if (!response.ok) return null;
  const payload = await response.json();
  const item = payload?.results?.[0];
  return item ? mapItunesResult(item, id) : null;
};

export const searchAppleApps = async (
  term: string,
  country = "US",
  limit = 5,
): Promise<ExternalStoreApp[]> => {
  const params = new URLSearchParams({
    term,
    country,
    media: "software",
    entity: "software",
    limit: String(limit),
  });
  const response = await fetch(`${ITUNES_API_BASE}/search?${params.toString()}`);
  if (!response.ok) return [];
  const payload = await response.json();
  const results: Record<string, any>[] = payload?.results || [];
  return results.map((item) => mapItunesResult(item));
};
