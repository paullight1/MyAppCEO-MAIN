import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Flame,
  Search,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import { Listing } from "../../../packages/types/src";
import { StoreAppCard } from "../components/StoreAppCard";
import { ListingCard } from "../components/ListingCard";
import { Layout } from "../components/Layout";
import { EmptyState, Skeleton } from "../components/ui";
import { useExternalApps } from "../hooks/useExternalApps";
import { useMarketplace } from "../hooks/useMarketplace";
import { ExternalStoreApp, StorePlatform } from "../types/externalApp";
import { validateUrl } from "../utils/security";
import { formatCompactCurrency, formatNumber } from "../utils/format";
import {
  getStoreArtworkUrl,
  getStoreIconUrl,
  getStoreScreenshotUrls,
} from "../utils/storeImport";

type SourceMode = "all" | "store" | "marketplace";
type SortMode =
  | "featured"
  | "rating"
  | "newest"
  | "price-low"
  | "price-high"
  | "revenue";

const CATEGORIES = [
  "All",
  "Productivity",
  "Finance",
  "Business",
  "Games",
  "AI Tool",
  "Health",
  "Education",
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "rating", label: "Most rated" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low" },
  { value: "price-high", label: "Price: High" },
  { value: "revenue", label: "Revenue" },
];

const formatCount = (count?: number) => {
  if (!count) return "No ratings yet";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M ratings`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K ratings`;
  return `${formatNumber(count)} ratings`;
};

const platformLabel = (platform: StorePlatform) => {
  if (platform === "ios") return "iOS App Store";
  if (platform === "android") return "Play Store";
  return "All stores";
};

const resolveStoreImageSource = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  const candidate = value as { url?: unknown; sourceUrl?: unknown };
  if (typeof candidate.url === "string" && candidate.url.trim())
    return candidate.url;
  if (typeof candidate.sourceUrl === "string" && candidate.sourceUrl.trim())
    return candidate.sourceUrl;

  return "";
};

const resolveStoreImageSources = (values: unknown[]): string[] =>
  values
    .map(resolveStoreImageSource)
    .filter((value): value is string => Boolean(value));

const ListingHero: React.FC<{ listing: Listing }> = ({ listing }) => {
  const currency = (listing as { currency?: string }).currency;
  return (
    <section className="relative min-h-[420px] overflow-hidden bg-foreground text-background">
      {listing.imageUrl && (
        <img
          src={listing.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/65 to-foreground/20" />
      <div className="relative mx-auto flex min-h-[420px] max-w-[1200px] flex-col justify-end px-4 pb-10 sm:px-6 sm:pb-14">
        <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-background/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-background/80 ring-1 ring-background/20">
          <Store size={13} /> Marketplace Listing
        </span>
        <h1 className="max-w-3xl text-[34px] font-bold leading-[1.03] tracking-tight sm:text-[52px]">
          {listing.name}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-6 text-background/70 sm:text-[17px]">
          {listing.shortDescription}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <span className="text-[28px] font-bold">
            {formatCompactCurrency(listing.askingPrice ?? 0, { currency })}
          </span>
          {listing.monthlyRevenue ? (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-[13px] font-bold text-emerald-300">
              {formatCompactCurrency(listing.monthlyRevenue, { currency })}/mo revenue
            </span>
          ) : null}
          {listing.revenueVerified ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-300">
              <CheckCircle2 size={15} /> Verified
            </span>
          ) : null}
        </div>
        <Link
          to={`/listings/${listing.id}`}
          className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-background px-5 py-3 text-[14px] font-bold text-foreground transition-all hover:bg-background/90 active:scale-[0.98]"
        >
          View listing <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
};

const StoreHero: React.FC<{ app: ExternalStoreApp }> = ({ app }) => {
  const artworkUrl = resolveStoreImageSource(getStoreArtworkUrl(app));
  const iconUrl = resolveStoreImageSource(getStoreIconUrl(app));
  const screenshotUrls = resolveStoreImageSources(getStoreScreenshotUrls(app));
  const backdropUrl = artworkUrl || iconUrl;
  const galleryUrls =
    screenshotUrls.length > 0
      ? screenshotUrls.slice(0, 3)
      : backdropUrl
        ? [backdropUrl]
        : [];
  const appInitial = app.name?.[0]?.toUpperCase() || "?";

  return (
    <section className="relative min-h-[460px] overflow-hidden bg-foreground text-background">
      {backdropUrl ? (
        <img
          src={backdropUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45 blur-[1px]"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/75 to-foreground/40" />
      <div className="relative mx-auto grid min-h-[460px] max-w-[1200px] grid-cols-1 items-end gap-8 px-4 pb-10 pt-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-14">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-background/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-background/75 ring-1 ring-background/20">
            <Sparkles size={13} /> Live{" "}
            {app.source === "apple-app-store" ? "App Store" : "Play Store"}{" "}
            Catalog
          </span>
          <div className="flex items-end gap-4">
            {iconUrl || backdropUrl ? (
              <img
                src={iconUrl || backdropUrl}
                alt={`${app.name} icon`}
                className="h-24 w-24 rounded-[22px] border border-background/25 bg-background object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[22px] border border-background/25 bg-background text-[28px] font-bold text-foreground shadow-2xl">
                {appInitial}
              </div>
            )}
            <div className="min-w-0 pb-1">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary">
                {app.category}
              </p>
              <h1 className="mt-2 max-w-3xl text-[34px] font-bold leading-[1.03] tracking-tight sm:text-[52px]">
                {app.name}
              </h1>
              <p className="mt-2 text-[15px] font-medium text-background/60">
                {app.developer}
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-[15px] leading-6 text-background/70 sm:text-[17px]">
            {app.shortDescription || app.description}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1.5 text-[13px] font-bold">
              <Star size={14} className="fill-current text-amber-400" />{" "}
              {app.rating ? app.rating.toFixed(1) : "New"}
            </span>
            <span className="text-[13px] font-bold text-background/60">
              {formatCount(app.ratingCount)}
            </span>
            <span className="rounded-full bg-background px-4 py-1.5 text-[13px] font-bold text-primary">
              {app.priceText || "Free"}
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to={`/store-apps/${app.platform}/${app.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              View store page <ArrowUpRight size={15} />
            </Link>
            <Link
              to={`/listings/new?storePlatform=${app.platform}&storeId=${encodeURIComponent(app.id)}&country=US`}
              className="inline-flex items-center gap-2 rounded-full bg-background px-5 py-3 text-[14px] font-bold text-foreground transition-all hover:bg-background/90 active:scale-[0.98]"
            >
              Import listing <ArrowUpRight size={15} />
            </Link>
            {app.storeUrl && validateUrl(app.storeUrl) ? (
              <a
                href={app.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-background/10 px-5 py-3 text-[14px] font-bold text-background ring-1 ring-background/20 transition-all hover:bg-background/20 active:scale-[0.98]"
              >
                Open original <ArrowUpRight size={15} />
              </a>
            ) : null}
          </div>
        </div>
        <div className="hidden items-end gap-4 lg:flex">
          {galleryUrls.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="overflow-hidden rounded-[24px] border border-background/15 bg-background/10 shadow-2xl"
              style={{
                width: index === 1 ? 210 : 170,
                transform: `translateY(${index === 1 ? -28 : index * 12}px)`,
              }}
            >
              <img
                src={src}
                alt=""
                className="h-[360px] w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <Skeleton className="aspect-[16/10] w-full rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const HorizontalSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  count?: number;
}> = ({ title, icon, children, count }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) =>
    ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h2 className="text-[19px] font-bold text-foreground">{title}</h2>
            {count !== undefined ? (
              <p className="text-[12px] font-medium text-muted-foreground">
                {count} apps
              </p>
            ) : null}
          </div>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {/* Mobile scroll affordance: edge fade hinting more content */}
      <div className="relative">
        <div
          ref={ref}
          className="flex snap-x gap-5 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {children}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
      </div>
    </section>
  );
};

export const MarketplacePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("all");
  const [storePlatform, setStorePlatform] = useState<StorePlatform>("ios");
  const [sortBy, setSortBy] = useState<SortMode>("featured");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [storeApps, setStoreApps] = useState<ExternalStoreApp[]>([]);
  const [storeWarnings, setStoreWarnings] = useState<string[]>([]);

  const { getListings, isLoading: listingsLoading } = useMarketplace();
  const {
    searchExternalApps,
    isLoading: storeLoading,
    error: storeError,
  } = useExternalApps();

  useEffect(() => {
    const loadListings = async () => {
      const result = await getListings();
      const payload = result?.data?.data;
      if (Array.isArray(payload)) {
        setListings(payload);
      } else if (payload && Array.isArray((payload as any).data)) {
        setListings((payload as any).data);
      }
    };

    loadListings();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (sourceMode === "marketplace") return;
      const result = await searchExternalApps({
        term: searchQuery.trim() || undefined,
        category:
          !searchQuery.trim() && activeCategory !== "All"
            ? activeCategory
            : undefined,
        platform: storePlatform,
        country: "US",
        limit: 32,
      });

      const payload = result?.data?.data;
      if (payload) {
        setStoreApps(payload.apps || []);
        setStoreWarnings(payload.warnings || []);
      }
    }, 280);

    return () => window.clearTimeout(handle);
  }, [activeCategory, searchQuery, sourceMode, storePlatform]);

  const visibleListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return listings
      .filter((listing) => {
        const matchesCategory =
          activeCategory === "All" || listing.category === activeCategory;
        const matchesSearch =
          !query ||
          listing.name?.toLowerCase().includes(query) ||
          listing.category?.toLowerCase().includes(query) ||
          listing.shortDescription?.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price-low":
            return (a.askingPrice ?? 0) - (b.askingPrice ?? 0);
          case "price-high":
            return (b.askingPrice ?? 0) - (a.askingPrice ?? 0);
          case "revenue":
            return (b.monthlyRevenue ?? 0) - (a.monthlyRevenue ?? 0);
          case "newest":
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          default:
            return (
              (b.monthlyRevenue ?? b.askingPrice ?? 0) -
              (a.monthlyRevenue ?? a.askingPrice ?? 0)
            );
        }
      });
  }, [activeCategory, listings, searchQuery, sortBy]);

  const sortedStoreApps = useMemo(() => {
    return [...storeApps].sort((a, b) => {
      switch (sortBy) {
        case "rating":
        case "featured":
          return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
        case "newest":
          return (
            new Date(b.updatedAt || b.releaseDate || 0).getTime() -
            new Date(a.updatedAt || a.releaseDate || 0).getTime()
          );
        default:
          return (b.rating ?? 0) - (a.rating ?? 0);
      }
    });
  }, [sortBy, storeApps]);

  const heroListing = visibleListings[0];
  const heroStoreApp = sortedStoreApps[0];
  const topStoreApps = sortedStoreApps.slice(0, 12);
  const newStoreApps = [...sortedStoreApps]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.releaseDate || 0).getTime() -
        new Date(a.updatedAt || a.releaseDate || 0).getTime(),
    )
    .slice(0, 12);

  const showStore = sourceMode === "all" || sourceMode === "store";
  const showMarketplace = sourceMode === "all" || sourceMode === "marketplace";
  const isInitialLoading =
    (storeLoading && storeApps.length === 0 && showStore) ||
    (listingsLoading && listings.length === 0 && showMarketplace);

  const listCtaClass =
    "inline-flex items-center rounded-full bg-primary px-5 py-3 text-[14px] font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]";

  return (
    <Layout>
      <div className="-mt-8 min-h-screen bg-background transition-colors duration-300">
        {showStore && heroStoreApp ? (
          <StoreHero app={heroStoreApp} />
        ) : heroListing ? (
          <ListingHero listing={heroListing} />
        ) : (
          <section className="bg-foreground px-4 pb-12 pt-28 text-background sm:px-6">
            <div className="mx-auto max-w-[1200px]">
              <span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-background/75 ring-1 ring-background/20">
                <Store size={13} /> Live Store Catalog
              </span>
              <h1 className="mt-5 max-w-3xl text-[36px] font-bold leading-[1.03] tracking-tight sm:text-[56px]">
                Real apps, real assets, real store media.
              </h1>
              <p className="mt-4 max-w-2xl text-[16px] leading-7 text-background/65">
                Search live App Store metadata and compare it alongside MyAppCEO
                marketplace listings.
              </p>
            </div>
          </section>
        )}

        <div className="sticky top-[44px] z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-[1200px] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setMobileFiltersOpen((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:hidden"
                aria-label="Toggle filters"
                aria-expanded={mobileFiltersOpen}
              >
                <Filter size={18} />
              </button>

              <div
                className="flex min-w-0 flex-1 gap-2 overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                {(["all", "store", "marketplace"] as SourceMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      onClick={() => setSourceMode(mode)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-all active:scale-[0.96] ${
                        sourceMode === mode
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "all"
                        ? "All"
                        : mode === "store"
                          ? "Live Store"
                          : "For Sale"}
                    </button>
                  ),
                )}
              </div>

              <div
                className={`${mobileFiltersOpen ? "flex" : "hidden"} w-full flex-wrap items-end gap-2 sm:flex sm:w-auto`}
              >
                {(["ios", "android"] as StorePlatform[]).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => {
                      setStorePlatform(platform);
                      setSourceMode("store");
                    }}
                    className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all active:scale-[0.96] ${
                      storePlatform === platform && sourceMode !== "marketplace"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {platformLabel(platform)}
                  </button>
                ))}
                <div className="flex flex-col">
                  <label htmlFor="marketplace-sort" className="sr-only">
                    Sort apps
                  </label>
                  <select
                    id="marketplace-sort"
                    aria-label="Sort apps"
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as SortMode)
                    }
                    className="rounded-full bg-muted px-4 py-2 text-[13px] font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1200px] px-4 pb-20 pt-6 sm:px-6">
          <form
            className="relative mb-5"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="marketplace-search" className="sr-only">
              Search apps
            </label>
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              id="marketplace-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search real apps, categories, or marketplace listings..."
              className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-12 text-[15px] font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </form>

          <div
            className="mb-8 flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-all active:scale-[0.96] ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {storeWarnings.length > 0 && showStore ? (
            <div className="mb-8 flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Play Store provider needed</p>
                <p className="mt-1 text-sm leading-6 opacity-80">
                  {storeWarnings[0]}
                </p>
              </div>
            </div>
          ) : null}

          {storeError && showStore ? (
            <div className="mb-8 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error">
              {storeError}
            </div>
          ) : null}

          {isInitialLoading ? <SkeletonGrid /> : null}

          {!isInitialLoading && showStore && sourceMode === "store" ? (
            <>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold text-foreground">
                    {platformLabel(storePlatform)}
                  </h2>
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                    {sortedStoreApps.length} live app
                    {sortedStoreApps.length === 1 ? "" : "s"} from the external
                    catalog
                  </p>
                </div>
                <Link to="/listings/new" className={listCtaClass}>
                  List your app
                </Link>
              </div>
              {sortedStoreApps.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No real apps returned"
                  description="Try another search term or switch back to the iOS App Store source."
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sortedStoreApps.map((app) => (
                    <StoreAppCard key={`${app.platform}-${app.id}`} app={app} />
                  ))}
                </div>
              )}
            </>
          ) : null}

          {!isInitialLoading && sourceMode === "marketplace" ? (
            <>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold text-foreground">
                    MyAppCEO Listings
                  </h2>
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                    {visibleListings.length} app
                    {visibleListings.length === 1 ? "" : "s"} for sale or
                    investment
                  </p>
                </div>
                <Link to="/listings/new" className={listCtaClass}>
                  List your app
                </Link>
              </div>
              {visibleListings.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No MyAppCEO listings yet"
                  description="The live store catalog still works, but no sale listings match these filters."
                  action={{ label: "List your app", href: "/listings/new" }}
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </>
          ) : null}

          {!isInitialLoading && sourceMode === "all" ? (
            <>
              {showStore && sortedStoreApps.length > 0 ? (
                <>
                  <HorizontalSection
                    title="Live App Store Catalog"
                    icon={<Sparkles size={17} />}
                    count={topStoreApps.length}
                  >
                    {topStoreApps.map((app) => (
                      <div
                        key={`${app.platform}-${app.id}`}
                        className="min-w-[280px] snap-start sm:min-w-[310px]"
                      >
                        <StoreAppCard app={app} compact />
                      </div>
                    ))}
                  </HorizontalSection>

                  <HorizontalSection
                    title="Recently Updated Apps"
                    icon={<Clock size={17} />}
                    count={newStoreApps.length}
                  >
                    {newStoreApps.map((app) => (
                      <div
                        key={`${app.platform}-${app.id}-new`}
                        className="min-w-[280px] snap-start sm:min-w-[310px]"
                      >
                        <StoreAppCard app={app} compact />
                      </div>
                    ))}
                  </HorizontalSection>
                </>
              ) : null}

              {showMarketplace && visibleListings.length > 0 ? (
                <HorizontalSection
                  title="For Sale on MyAppCEO"
                  icon={<TrendingUp size={17} />}
                  count={visibleListings.slice(0, 12).length}
                >
                  {visibleListings.slice(0, 12).map((listing) => (
                    <div
                      key={listing.id}
                      className="min-w-[280px] snap-start sm:min-w-[310px]"
                    >
                      <ListingCard listing={listing} />
                    </div>
                  ))}
                </HorizontalSection>
              ) : null}

              {sortedStoreApps.length > 0 ? (
                <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="mb-5 flex items-center gap-3 text-[18px] font-bold text-foreground">
                      <Flame size={18} className="text-primary" /> Top Real Apps
                    </h3>
                    <div className="space-y-2">
                      {topStoreApps.slice(0, 6).map((app, index) => {
                        const thumbnailUrl =
                          resolveStoreImageSource(getStoreIconUrl(app)) ||
                          resolveStoreImageSource(getStoreArtworkUrl(app));
                        const appInitial = app.name?.[0]?.toUpperCase() || "?";

                        return (
                          <Link
                            key={`${app.platform}-${app.id}-rank`}
                            to={`/store-apps/${app.platform}/${app.id}`}
                            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
                          >
                            <span className="w-6 text-center text-[13px] font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                            {thumbnailUrl ? (
                              <img
                                src={thumbnailUrl}
                                alt=""
                                className="h-11 w-11 rounded-xl object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-[13px] font-bold text-muted-foreground">
                                {appInitial}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-bold text-foreground">
                                {app.name}
                              </p>
                              <p className="truncate text-[11px] font-medium text-muted-foreground">
                                {app.developer}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-muted-foreground">
                              <Star
                                size={12}
                                className="fill-current text-amber-500"
                              />{" "}
                              {app.rating ? app.rating.toFixed(1) : "New"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="mb-5 flex items-center gap-3 text-[18px] font-bold text-foreground">
                      <Store size={18} className="text-primary" /> Import Notes
                    </h3>
                    <div className="space-y-4 text-[14px] leading-6 text-muted-foreground">
                      <p>
                        iOS apps are loaded from live App Store metadata,
                        including screenshots, icons, ratings, developer names,
                        descriptions, and original store URLs.
                      </p>
                      <p>
                        Play Store catalog import is ready for a provider
                        endpoint. Google does not expose a public full-store
                        catalog search API, so the backend avoids fake Android
                        data.
                      </p>
                      <Link to="/listings/new" className={listCtaClass}>
                        Add a MyAppCEO listing <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                </section>
              ) : visibleListings.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No apps loaded"
                  description="Try searching for a real App Store app or check that the backend API is running."
                />
              ) : null}
            </>
          ) : null}
        </main>
      </div>
    </Layout>
  );
};
