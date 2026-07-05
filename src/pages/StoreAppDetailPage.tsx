import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  Download,
  Globe,
  ShieldCheck,
  Star,
  Store,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { ErrorState, Skeleton } from "../components/ui";
import { useExternalApps } from "../hooks/useExternalApps";
import { ExternalStoreApp } from "../types/externalApp";
import { validateUrl } from "../utils/security";
import { formatNumber } from "../utils/format";
import {
  getStoreArtworkUrl,
  getStoreIconUrl,
  getStoreScreenshotUrls,
} from "../utils/storeImport";

const formatCount = (count?: number) => {
  if (!count) return "No ratings yet";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return formatNumber(count);
};

const formatDate = (date?: string) => {
  if (!date) return "Not provided";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const sourceLabel = (app?: ExternalStoreApp | null) =>
  app?.source === "google-play" ? "Google Play" : "Apple App Store";

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

const StoreAppSkeleton: React.FC = () => (
  <Layout>
    <div className="-mt-8 min-h-screen bg-background pb-20">
      <section className="bg-foreground px-4 pb-12 pt-28 sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <Skeleton className="h-4 w-32 bg-background/20" />
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <Skeleton className="h-32 w-32 rounded-[30px] bg-background/20" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-24 bg-background/20" />
                <Skeleton className="h-10 w-64 bg-background/20" />
                <Skeleton className="h-4 w-40 bg-background/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-[18px] bg-background/20" />
              ))}
            </div>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[420px] min-w-[210px] rounded-[24px]" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-[24px]" />
          </div>
          <Skeleton className="h-80 w-full rounded-[24px]" />
        </div>
      </main>
    </div>
  </Layout>
);

export const StoreAppDetailPage: React.FC = () => {
  const { platform, id } = useParams<{
    platform: "ios" | "android";
    id: string;
  }>();
  const [app, setApp] = useState<ExternalStoreApp | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const { getExternalApp, isLoading, error } = useExternalApps();

  useEffect(() => {
    const loadApp = async () => {
      if (!platform || !id) return;
      const result = await getExternalApp(platform, id, "US");
      const payload = result?.data?.data;
      if (payload) {
        setApp(payload);
        const screenshotUrls = resolveStoreImageSources(
          getStoreScreenshotUrls(payload),
        );
        setActiveImage(
          screenshotUrls[0] ||
            resolveStoreImageSource(getStoreArtworkUrl(payload)) ||
            resolveStoreImageSource(getStoreIconUrl(payload)),
        );
      }
    };

    loadApp();
  }, [platform, id]);

  const screenshots = useMemo(() => {
    if (!app) return [];
    const screenshotUrls = resolveStoreImageSources(
      getStoreScreenshotUrls(app),
    );
    if (screenshotUrls.length > 0) return screenshotUrls;

    const fallbackImage =
      resolveStoreImageSource(getStoreArtworkUrl(app)) ||
      resolveStoreImageSource(getStoreIconUrl(app));
    return fallbackImage ? [fallbackImage] : [];
  }, [app]);
  const iconUrl = resolveStoreImageSource(getStoreIconUrl(app));
  const artworkUrl = resolveStoreImageSource(getStoreArtworkUrl(app));
  const appInitial = app?.name?.[0]?.toUpperCase() || "?";

  if (isLoading && !app) {
    return <StoreAppSkeleton />;
  }

  if (error || !app) {
    return (
      <Layout>
        <div className="mx-auto max-w-[560px] px-4 py-28">
          <ErrorState
            title="Store app not found"
            description={
              error || "The external store catalog could not return this app."
            }
            secondaryAction={{
              label: "Back to marketplace",
              href: "/marketplace",
              icon: ArrowLeft,
            }}
          />
        </div>
      </Layout>
    );
  }

  const heroStats = [
    {
      label: "Rating",
      value: app.rating ? app.rating.toFixed(1) : "New",
      icon: Star,
    },
    {
      label: "Reviews",
      value: formatCount(app.ratingCount),
      icon: BadgeCheck,
    },
    {
      label: "Price",
      value: app.priceText || "Free",
      icon: Download,
    },
    {
      label: "Content rating",
      value: app.contentRating || "Rated",
      icon: ShieldCheck,
    },
  ];

  return (
    <Layout>
      <div className="-mt-8 min-h-screen bg-background pb-20">
        <section className="relative overflow-hidden bg-foreground px-4 pb-12 pt-28 text-background sm:px-6">
          {activeImage ? (
            <img
              src={activeImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/50" />
          <div className="relative mx-auto max-w-[1200px]">
            <Link
              to="/marketplace"
              className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-background/70 transition-colors hover:text-background"
            >
              <ArrowLeft size={16} /> Back to Marketplace
            </Link>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                  {iconUrl || artworkUrl ? (
                    <img
                      src={iconUrl || artworkUrl}
                      alt={`${app.name} icon`}
                      className="h-32 w-32 rounded-[30px] border border-background/25 bg-background object-cover shadow-2xl"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-[30px] border border-background/25 bg-background text-[32px] font-bold text-foreground shadow-2xl">
                      {appInitial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-background/70 ring-1 ring-background/20">
                      <Store size={12} /> {sourceLabel(app)}
                    </span>
                    <h1 className="mt-4 text-[36px] font-bold leading-[1.04] tracking-tight sm:text-[56px]">
                      {app.name}
                    </h1>
                    <p className="mt-2 text-[16px] font-medium text-background/65">
                      {app.developer}
                    </p>
                  </div>
                </div>

                <p className="mt-7 max-w-2xl text-[16px] leading-7 text-background/70">
                  {app.shortDescription || app.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {app.storeUrl && validateUrl(app.storeUrl) ? (
                    <a
                      href={app.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                    >
                      Open in {sourceLabel(app)} <ArrowUpRight size={15} />
                    </a>
                  ) : null}
                  <Link
                    to={`/listings/new?storePlatform=${app.platform}&storeId=${encodeURIComponent(app.id)}&country=US`}
                    className="inline-flex items-center gap-2 rounded-full bg-background/10 px-5 py-3 text-sm font-bold text-background ring-1 ring-background/20 transition-all hover:bg-background/20 active:scale-[0.98]"
                  >
                    Import into listing <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {heroStats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-[18px] border border-background/15 bg-background/10 p-4 backdrop-blur-xl"
                    >
                      <Icon size={18} className="mb-5 text-primary" />
                      <p className="text-[22px] font-bold">{item.value}</p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-background/50">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6">
          <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-8">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Screenshots
                    </h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Original media supplied by the external store catalog.
                    </p>
                  </div>
                </div>
                {/* Screenshot rail with mobile scroll affordance */}
                <div className="relative">
                  <div
                    className="flex gap-4 overflow-x-auto pb-3"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {screenshots.map((src, index) => (
                      <button
                        key={`${src}-${index}`}
                        onClick={() => setActiveImage(src)}
                        aria-label={`View screenshot ${index + 1}`}
                        aria-pressed={activeImage === src}
                        className={`min-w-[210px] snap-start overflow-hidden rounded-[24px] border bg-card transition-all active:scale-[0.98] ${activeImage === src ? "border-primary ring-4 ring-primary/10" : "border-border"}`}
                      >
                        <img
                          src={src}
                          alt={`${app.name} screenshot ${index + 1}`}
                          className="h-[420px] w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                  {screenshots.length > 1 ? (
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-border bg-card p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-foreground">
                  About {app.name}
                </h2>
                <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-muted-foreground">
                  {app.description ||
                    "No description was returned by the store catalog."}
                </div>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[24px] border border-border bg-card p-6">
                <h3 className="text-lg font-bold text-foreground">
                  Store Details
                </h3>
                <div className="mt-5 divide-y divide-border">
                  {[
                    { label: "Category", value: app.category, icon: Store },
                    { label: "Developer", value: app.developer, icon: Globe },
                    {
                      label: "Version",
                      value: app.version || "Not provided",
                      icon: BadgeCheck,
                    },
                    {
                      label: "Released",
                      value: formatDate(app.releaseDate),
                      icon: Calendar,
                    },
                    {
                      label: "Updated",
                      value: formatDate(app.updatedAt),
                      icon: Calendar,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-1 break-words text-sm font-bold text-foreground">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] bg-foreground p-6 text-background">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-background/50">
                  Catalog Status
                </p>
                <h3 className="mt-2 text-xl font-bold">Real store metadata</h3>
                <p className="mt-3 text-sm leading-6 text-background/60">
                  This page is generated from external store data. It is not a
                  MyAppCEO sale listing until an owner lists the asset on the
                  marketplace.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </Layout>
  );
};
