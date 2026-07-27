import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheService } from "../../common/cache/cache.service";
import { ExternalAppSearchDto, StorePlatform } from "./dto/external-apps.dto";

export interface ExternalStoreMediaAsset {
  url: string;
  width?: number;
  height?: number;
  type?: "icon" | "screenshot" | "artwork";
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
  name: string;
  developer: string;
  category: string;
  description: string;
  shortDescription?: string;
  iconUrl: string;
  artworkUrl: string;
  screenshots: string[];
  media?: ExternalStoreMediaBundle;
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
  country?: string;
  locale?: string;
  fetchedAt?: string;
  rawMetadata?: Record<string, unknown>;
}

export interface ExternalCatalogResult {
  apps: ExternalStoreApp[];
  warnings: string[];
  meta: {
    country: string;
    platform: StorePlatform;
    queryTerms: string[];
    sources: string[];
  };
}

interface AppleSearchResponse {
  resultCount: number;
  results: AppleSoftwareResult[];
}

interface AppleSoftwareResult {
  trackId: number;
  trackName: string;
  sellerName?: string;
  artistName?: string;
  primaryGenreName?: string;
  genres?: string[];
  description?: string;
  artworkUrl100?: string;
  artworkUrl512?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  averageUserRating?: number;
  userRatingCount?: number;
  formattedPrice?: string;
  trackViewUrl?: string;
  bundleId?: string;
  releaseDate?: string;
  currentVersionReleaseDate?: string;
  contentAdvisoryRating?: string;
  trackContentRating?: string;
  version?: string;
}

interface GooglePlayJsonLd {
  name?: string;
  url?: string;
  description?: string;
  applicationCategory?: string;
  image?: string | string[];
  contentRating?: string;
  author?: { name?: string } | string;
  aggregateRating?: {
    ratingValue?: number | string;
    ratingCount?: number | string;
    reviewCount?: number | string;
  };
  offers?:
    | {
        price?: number | string;
        priceCurrency?: string;
      }
    | Array<{
        price?: number | string;
        priceCurrency?: string;
      }>;
}

const DEFAULT_QUERY_TERMS = [
  "productivity",
  "finance",
  "photo video",
  "health fitness",
  "education",
  "games",
  "business",
];

const CATEGORY_QUERY_TERMS: Record<string, string[]> = {
  ai: ["ai assistant", "ai productivity", "chatbot"],
  "ai tool": ["ai assistant", "ai productivity", "chatbot"],
  business: ["business", "crm", "invoice"],
  education: ["education", "learning", "language learning"],
  finance: ["finance", "budget", "investing"],
  game: ["games", "arcade games", "puzzle games"],
  games: ["games", "arcade games", "puzzle games"],
  health: ["health fitness", "workout", "meditation"],
  mobile: ["mobile app", "productivity", "utility"],
  productivity: ["productivity", "notes", "calendar"],
  saas: ["business", "productivity", "project management"],
  social: ["social networking", "messaging"],
  utility: ["utilities", "scanner", "password manager"],
  "web app": ["productivity", "business", "collaboration"],
};

@Injectable()
export class ExternalAppsService {
  private readonly appleApiBase = "https://itunes.apple.com";
  private readonly googlePlayBase = "https://play.google.com";
  private readonly defaultLocale = "en";
  private readonly publicGooglePlaySearchTermLimit = 2;
  private readonly publicGooglePlayAppLimit = 8;
  private readonly externalRequestTimeoutMs = 8000;
  private readonly externalSearchCacheTtlSeconds = 900;
  private readonly externalAppCacheTtlSeconds = 3600;

  constructor(
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async search(query: ExternalAppSearchDto): Promise<ExternalCatalogResult> {
    const platform = query.platform ?? "all";
    const country = this.normalizeCountry(query.country);
    const limit = this.normalizeLimit(query.limit);
    const queryTerms = this.getQueryTerms(query.term, query.category);
    const cacheKey = this.cacheService.createKey("external-apps:search", {
      platform,
      country,
      limit,
      terms: queryTerms.join("|"),
    });

    return this.cacheService.wrap(
      cacheKey,
      this.externalSearchCacheTtlSeconds,
      async () => {
        const warnings: string[] = [];
        const results: ExternalStoreApp[] = [];
        const sources: string[] = [];

        if (platform === "ios" || platform === "all") {
          const iosApps = await this.searchAppleApps(queryTerms, country, limit);
          results.push(...iosApps);
          sources.push("apple-app-store");
        }

        if (platform === "android" || platform === "all") {
          const googleResult = await this.searchGooglePlayApps(
            queryTerms,
            country,
            limit,
          );
          results.push(...googleResult.apps);
          warnings.push(...googleResult.warnings);
          if (googleResult.apps.length > 0) sources.push("google-play");
        }

        return {
          apps: this.dedupeApps(results).slice(0, limit),
          warnings,
          meta: {
            country,
            platform,
            queryTerms,
            sources,
          },
        };
      },
    );
  }

  async findOne(
    platform: StorePlatform,
    id: string,
    country?: string,
  ): Promise<ExternalStoreApp> {
    if (platform === "all") {
      throw new NotFoundException("A concrete platform is required");
    }

    const normalizedCountry = this.normalizeCountry(country);
    const normalizedId = id.trim();
    const cacheKey = this.cacheService.createKey("external-apps:findOne", {
      platform,
      id: normalizedId,
      country: normalizedCountry,
    });

    return this.cacheService.wrap(
      cacheKey,
      this.externalAppCacheTtlSeconds,
      async () => {
        if (platform === "ios") {
          return this.lookupAppleApp(normalizedId, normalizedCountry);
        }

        return this.lookupGooglePlayApp(normalizedId, normalizedCountry);
      },
    );
  }

  private async searchAppleApps(
    terms: string[],
    country: string,
    limit: number,
  ): Promise<ExternalStoreApp[]> {
    const perTermLimit = Math.max(
      8,
      Math.ceil(limit / Math.max(terms.length, 1)),
    );
    const responses = await Promise.all(
      terms.map(async (term) => {
        const params = new URLSearchParams({
          term,
          country,
          media: "software",
          entity: "software",
          limit: perTermLimit.toString(),
        });

        const json = await this.fetchJson<AppleSearchResponse>(
          `${this.appleApiBase}/search?${params.toString()}`,
        );

        return json.results.map((item) => this.mapAppleApp(item, country));
      }),
    );

    return this.dedupeApps(responses.flat());
  }

  private async lookupAppleApp(
    id: string,
    country: string,
  ): Promise<ExternalStoreApp> {
    const params = new URLSearchParams({
      id,
      country,
      media: "software",
      entity: "software",
      limit: "1",
    });

    const json = await this.fetchJson<AppleSearchResponse>(
      `${this.appleApiBase}/lookup?${params.toString()}`,
    );

    const app = json.results[0];
    if (!app) {
      throw new NotFoundException(`App Store app ${id} was not found`);
    }

    return this.mapAppleApp(app, country);
  }

  private async searchGooglePlayApps(
    terms: string[],
    country: string,
    limit: number,
  ): Promise<{ apps: ExternalStoreApp[]; warnings: string[] }> {
    const providerResult = await this.searchGooglePlayProvider(
      terms,
      country,
      limit,
    );
    if (providerResult.apps.length > 0) return providerResult;

    const publicTerms = terms.slice(0, this.publicGooglePlaySearchTermLimit);
    const maxApps = Math.min(limit, this.publicGooglePlayAppLimit);
    const apps: ExternalStoreApp[] = [];
    const warnings = [...providerResult.warnings];
    const perTermLimit = Math.max(
      4,
      Math.ceil(maxApps / Math.max(publicTerms.length, 1)),
    );

    // Cap public fallback work so one request cannot fan out into a large crawl.
    for (const term of publicTerms) {
      try {
        const params = new URLSearchParams({
          q: term,
          c: "apps",
          hl: this.defaultLocale,
          gl: country,
        });
        const html = await this.fetchText(
          `${this.googlePlayBase}/store/search?${params.toString()}`,
        );
        const packageIds = this.extractGooglePlayAppIds(html).slice(
          0,
          perTermLimit,
        );

        for (const packageId of packageIds) {
          if (apps.length >= maxApps) break;
          try {
            apps.push(await this.fetchPublicGooglePlayApp(packageId, country));
          } catch {
            warnings.push(
              `Google Play app ${packageId} could not be imported from public metadata.`,
            );
          }
        }
      } catch {
        warnings.push(
          `Google Play search for "${term}" could not be imported from public metadata.`,
        );
      }
    }

    return { apps: this.dedupeApps(apps).slice(0, maxApps), warnings };
  }

  private async lookupGooglePlayApp(
    id: string,
    country: string,
  ): Promise<ExternalStoreApp> {
    const providerBaseUrl = this.config.get<string>(
      "GOOGLE_PLAY_CATALOG_API_URL",
    );
    if (providerBaseUrl) {
      try {
        const params = new URLSearchParams({ id, country });
        const json = await this.fetchJson<any>(
          `${providerBaseUrl}/lookup?${params.toString()}`,
          {
            Authorization: this.googleProviderAuthHeader(),
          },
        );

        const app = this.normalizeProviderApps(json, "android", country)[0];
        if (app) return app;
      } catch {
        // Fall through to public Google Play metadata. The provider remains optional, not a hard dependency.
      }
    }

    return this.fetchPublicGooglePlayApp(id, country);
  }

  private async searchGooglePlayProvider(
    terms: string[],
    country: string,
    limit: number,
  ): Promise<{ apps: ExternalStoreApp[]; warnings: string[] }> {
    const providerBaseUrl = this.config.get<string>(
      "GOOGLE_PLAY_CATALOG_API_URL",
    );
    if (!providerBaseUrl) return { apps: [], warnings: [] };

    try {
      const apps: ExternalStoreApp[] = [];
      for (const term of terms) {
        const params = new URLSearchParams({
          term,
          country,
          limit: limit.toString(),
        });
        const json = await this.fetchJson<any>(
          `${providerBaseUrl}?${params.toString()}`,
          {
            Authorization: this.googleProviderAuthHeader(),
          },
        );
        apps.push(...this.normalizeProviderApps(json, "android", country));
      }

      return { apps: this.dedupeApps(apps).slice(0, limit), warnings: [] };
    } catch {
      return {
        apps: [],
        warnings: [
          "Google Play catalog provider failed; public Play Store metadata fallback was used.",
        ],
      };
    }
  }

  private async fetchPublicGooglePlayApp(
    id: string,
    country: string,
  ): Promise<ExternalStoreApp> {
    const packageName = id.trim();
    const params = new URLSearchParams({
      id: packageName,
      hl: this.defaultLocale,
      gl: country,
    });
    const html = await this.fetchText(
      `${this.googlePlayBase}/store/apps/details?${params.toString()}`,
    );
    return this.mapGooglePlayPage(html, packageName, country);
  }

  private async fetchJson<T>(
    url: string,
    headers?: Record<string, string | undefined>,
  ): Promise<T> {
    const response = await this.fetchWithTimeout(url, {
      headers: Object.fromEntries(
        Object.entries(headers ?? {}).filter(([, value]) => Boolean(value)),
      ) as HeadersInit,
    });

    if (!response.ok) {
      throw new BadGatewayException(
        `External app catalog request failed: ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async fetchText(url: string): Promise<string> {
    const response = await this.fetchWithTimeout(url, {
      headers: this.googlePlayHeaders(),
    });

    if (!response.ok) {
      throw new BadGatewayException(
        `External app catalog request failed: ${response.status}`,
      );
    }

    return response.text();
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.externalRequestTimeoutMs,
    );

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new BadGatewayException(
          "External app catalog request timed out",
        );
      }

      throw new BadGatewayException("External app catalog request failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapAppleApp(
    item: AppleSoftwareResult,
    country: string,
  ): ExternalStoreApp {
    const screenshots = [
      ...(item.screenshotUrls ?? []),
      ...(item.ipadScreenshotUrls ?? []),
    ].filter(Boolean);
    const iconUrl = this.upgradeAppleArtwork(
      item.artworkUrl512 || item.artworkUrl100 || "",
    );
    const artworkUrl = screenshots[0] || iconUrl;

    return {
      id: String(item.trackId),
      platform: "ios",
      source: "apple-app-store",
      name: item.trackName,
      developer: item.sellerName || item.artistName || "Unknown developer",
      category: item.primaryGenreName || item.genres?.[0] || "Apps",
      description: item.description || "",
      shortDescription: this.shortText(item.description || ""),
      iconUrl,
      artworkUrl,
      screenshots,
      media: this.buildMediaBundle(iconUrl, artworkUrl, screenshots),
      rating: item.averageUserRating,
      ratingCount: item.userRatingCount,
      priceText: item.formattedPrice || "Free",
      storeUrl: item.trackViewUrl || "",
      bundleId: item.bundleId,
      releaseDate: item.releaseDate,
      updatedAt: item.currentVersionReleaseDate,
      contentRating: item.trackContentRating || item.contentAdvisoryRating,
      version: item.version,
      country,
      locale: this.defaultLocale,
      fetchedAt: new Date().toISOString(),
      rawMetadata: item as unknown as Record<string, unknown>,
    };
  }

  private mapGooglePlayPage(
    html: string,
    fallbackPackageName: string,
    country: string,
  ): ExternalStoreApp {
    const jsonLd = this.extractGooglePlayJsonLd(html);
    const packageName =
      this.extractMetaContent(html, "name", "appstore:bundle_id") ||
      this.extractMetaContent(html, "name", "appstore:store_id") ||
      fallbackPackageName;
    const name = this.cleanText(jsonLd?.name || this.extractTitle(html));

    if (!name) {
      throw new NotFoundException(
        `Google Play app ${fallbackPackageName} was not found`,
      );
    }

    const iconUrl =
      this.firstImageUrl(jsonLd?.image) ||
      this.extractMetaContent(html, "property", "og:image") ||
      "";
    const screenshots = this.extractScreenshotUrls(html);
    const artworkUrl = screenshots[0] || iconUrl;
    const description =
      this.extractLongDescription(html) ||
      this.cleanText(jsonLd?.description || "");
    const rating = this.toNumber(jsonLd?.aggregateRating?.ratingValue);
    const ratingCount = this.toInteger(
      jsonLd?.aggregateRating?.ratingCount ??
        jsonLd?.aggregateRating?.reviewCount,
    );
    const updatedAt = this.extractLabelValue(html, ["Updated on", "Updated"]);
    const developer = this.extractGooglePlayDeveloper(jsonLd);
    const priceText = this.normalizeGooglePlayPrice(jsonLd?.offers);

    return {
      id: packageName,
      platform: "android",
      source: "google-play",
      name,
      developer,
      category: this.normalizeGooglePlayCategory(jsonLd?.applicationCategory),
      description,
      shortDescription: this.shortText(
        description || this.cleanText(jsonLd?.description || ""),
      ),
      iconUrl,
      artworkUrl,
      screenshots,
      media: this.buildMediaBundle(iconUrl, artworkUrl, screenshots),
      rating,
      ratingCount,
      priceText,
      storeUrl: `${this.googlePlayBase}/store/apps/details?id=${encodeURIComponent(packageName)}`,
      packageName,
      updatedAt,
      contentRating: jsonLd?.contentRating,
      country,
      locale: this.defaultLocale,
      fetchedAt: new Date().toISOString(),
      rawMetadata: jsonLd ? { jsonLd } : undefined,
    };
  }

  private normalizeProviderApps(
    payload: any,
    platform: Exclude<StorePlatform, "ios" | "all">,
    country?: string,
  ) {
    const rawApps = Array.isArray(payload)
      ? payload
      : payload?.apps || payload?.data || [];

    return rawApps
      .map((item: any): ExternalStoreApp | null => {
        const id =
          item.id || item.appId || item.packageName || item.package_name;
        const name = item.name || item.title;
        if (!id || !name) return null;

        const screenshots = this.normalizeStringList(
          item.screenshots || item.screenshotUrls || [],
        );
        const iconUrl = item.iconUrl || item.icon || item.artworkUrl || "";
        const artworkUrl = item.artworkUrl || screenshots[0] || iconUrl;

        return {
          id: String(id),
          platform,
          source: "google-play",
          name,
          developer:
            item.developer || item.developerName || "Unknown developer",
          category: item.category || item.genre || "Apps",
          description: item.description || item.summary || "",
          shortDescription:
            item.shortDescription ||
            this.shortText(item.description || item.summary || ""),
          iconUrl,
          artworkUrl,
          screenshots,
          media: this.buildMediaBundle(iconUrl, artworkUrl, screenshots),
          rating: this.toNumber(item.rating),
          ratingCount: this.toInteger(item.ratingCount || item.ratings),
          priceText: item.priceText || item.price || "Free",
          storeUrl: item.storeUrl || item.url || "",
          packageName: item.packageName || item.package_name || String(id),
          releaseDate: item.releaseDate,
          updatedAt: item.updatedAt || item.updated,
          contentRating: item.contentRating,
          version: item.version,
          country,
          locale: this.defaultLocale,
          fetchedAt: new Date().toISOString(),
          rawMetadata: item,
        };
      })
      .filter(Boolean) as ExternalStoreApp[];
  }

  private getQueryTerms(term?: string, category?: string): string[] {
    const explicitTerm = term?.trim();
    if (explicitTerm) return [explicitTerm];

    const categoryKey = category?.trim().toLowerCase();
    if (categoryKey && CATEGORY_QUERY_TERMS[categoryKey]) {
      return CATEGORY_QUERY_TERMS[categoryKey];
    }

    return DEFAULT_QUERY_TERMS;
  }

  private normalizeCountry(country?: string): string {
    return (country || "US").trim().slice(0, 2).toUpperCase() || "US";
  }

  private normalizeLimit(limit?: number): number {
    return Math.min(Math.max(limit || 24, 1), 50);
  }

  private dedupeApps(apps: ExternalStoreApp[]): ExternalStoreApp[] {
    const seen = new Set<string>();
    return apps.filter((app) => {
      const key = `${app.platform}:${app.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private shortText(text: string): string {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed.length <= 160) return trimmed;
    return `${trimmed.slice(0, 157).trim()}...`;
  }

  private upgradeAppleArtwork(url: string): string {
    return url.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, "/512x512bb.$1");
  }

  private googleProviderAuthHeader(): string | undefined {
    const key = this.config.get<string>("GOOGLE_PLAY_CATALOG_API_KEY");
    return key ? `Bearer ${key}` : undefined;
  }

  private googlePlayHeaders(): HeadersInit {
    return {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    };
  }

  private extractGooglePlayAppIds(html: string): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    const pattern = /\/store\/apps\/details\?id=([^"'&<>\\\s]+)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html))) {
      const id = this.decodeHtmlEntities(decodeURIComponent(match[1])).trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }

    return ids;
  }

  private extractGooglePlayJsonLd(html: string): GooglePlayJsonLd | null {
    const pattern =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html))) {
      try {
        const payload = JSON.parse(this.decodeHtmlEntities(match[1].trim()));
        const candidates = Array.isArray(payload) ? payload : [payload];
        const softwareApp = candidates.find((item) =>
          String(item?.["@type"] || "")
            .toLowerCase()
            .includes("softwareapplication"),
        );
        if (softwareApp) return softwareApp as GooglePlayJsonLd;
      } catch {
        continue;
      }
    }

    return null;
  }

  private extractMetaContent(
    html: string,
    attr: "name" | "property",
    value: string,
  ): string | undefined {
    const pattern = new RegExp(
      `<meta[^>]+${attr}=["']${this.escapeRegExp(value)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const reversePattern = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${this.escapeRegExp(value)}["'][^>]*>`,
      "i",
    );
    const match = pattern.exec(html) || reversePattern.exec(html);
    return match ? this.decodeHtmlEntities(match[1]) : undefined;
  }

  private extractTitle(html: string): string {
    const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const title = this.cleanText(match?.[1] || "");
    return title.replace(/\s*-\s*Apps on Google Play\s*$/i, "");
  }

  private extractLongDescription(html: string): string {
    const pattern =
      /<div[^>]+(?:class=["'][^"']*bARER[^"']*["'][^>]*data-g-id=["']description["']|data-g-id=["']description["'][^>]*class=["'][^"']*bARER[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i;
    const match = pattern.exec(html);
    return match ? this.cleanText(match[1]) : "";
  }

  private extractScreenshotUrls(html: string): string[] {
    const screenshots: string[] = [];
    const seen = new Set<string>();
    const pattern =
      /<img[^>]+(?:alt=["']Screenshot image["'][^>]*|data-screenshot-index=["'][^"']+["'][^>]*)>/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html))) {
      const src =
        this.extractAttribute(match[0], "src") ||
        this.extractAttribute(match[0], "data-src");
      if (!src || seen.has(src)) continue;
      seen.add(src);
      screenshots.push(this.decodeHtmlEntities(src));
    }

    return screenshots;
  }

  private extractLabelValue(
    html: string,
    labels: string[],
  ): string | undefined {
    for (const label of labels) {
      const pattern = new RegExp(
        `<div[^>]*>\\s*${this.escapeRegExp(label)}\\s*<\\/div>\\s*<div[^>]*>([\\s\\S]*?)<\\/div>`,
        "i",
      );
      const match = pattern.exec(html);
      if (match) return this.cleanText(match[1]);
    }

    return undefined;
  }

  private extractAttribute(tag: string, attribute: string): string | undefined {
    const pattern = new RegExp(
      `${this.escapeRegExp(attribute)}=["']([^"']+)["']`,
      "i",
    );
    const match = pattern.exec(tag);
    return match ? this.decodeHtmlEntities(match[1]) : undefined;
  }

  private extractGooglePlayDeveloper(jsonLd: GooglePlayJsonLd | null): string {
    const author = jsonLd?.author;
    if (typeof author === "string")
      return this.cleanText(author) || "Unknown developer";
    return this.cleanText(author?.name || "") || "Unknown developer";
  }

  private normalizeGooglePlayCategory(category?: string): string {
    const value = this.cleanText(category || "");
    if (!value) return "Apps";
    return value
      .replace(/^GAME_/i, "")
      .replace(/^APPLICATION_/i, "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private normalizeGooglePlayPrice(offers: GooglePlayJsonLd["offers"]): string {
    const offer = Array.isArray(offers) ? offers[0] : offers;
    const rawPrice = offer?.price;
    if (
      rawPrice === undefined ||
      rawPrice === null ||
      rawPrice === "" ||
      Number(rawPrice) === 0
    ) {
      return "Free";
    }

    const currency = offer?.priceCurrency ? `${offer.priceCurrency} ` : "";
    return `${currency}${rawPrice}`.trim();
  }

  private buildMediaBundle(
    iconUrl: string,
    artworkUrl: string,
    screenshots: string[],
  ): ExternalStoreMediaBundle {
    return {
      icon: iconUrl ? { url: iconUrl, type: "icon" } : undefined,
      artwork: artworkUrl ? { url: artworkUrl, type: "artwork" } : undefined,
      screenshots: screenshots.map((url) => ({ url, type: "screenshot" })),
    };
  }

  private firstImageUrl(image?: string | string[]): string | undefined {
    if (Array.isArray(image)) return image.find(Boolean);
    return image || undefined;
  }

  private normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  }

  private cleanText(value: string): string {
    return this.decodeHtmlEntities(
      value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " "),
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_, code) =>
        String.fromCharCode(parseInt(code, 16)),
      );
  }

  private toNumber(value: unknown): number | undefined {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  private toInteger(value: unknown): number | undefined {
    const number = this.toNumber(value);
    return number === undefined ? undefined : Math.round(number);
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
