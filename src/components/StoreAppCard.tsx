import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Star } from "lucide-react";
import { ExternalStoreApp } from "../types/externalApp";
import { getStoreArtworkUrl, getStoreIconUrl } from "../utils/storeImport";

interface StoreAppCardProps {
  app: ExternalStoreApp;
  compact?: boolean;
}

const formatRatingCount = (count?: number) => {
  if (!count) return "No ratings";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M ratings`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K ratings`;
  return `${count.toLocaleString()} ratings`;
};

const sourceLabel = (app: ExternalStoreApp) =>
  app.source === "apple-app-store" ? "App Store" : "Play Store";

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

export const StoreAppCard: React.FC<StoreAppCardProps> = ({
  app,
  compact = false,
}) => {
  const artworkUrl = resolveStoreImageSource(getStoreArtworkUrl(app));
  const iconUrl = resolveStoreImageSource(getStoreIconUrl(app));
  const appInitial = app.name?.[0]?.toUpperCase() || "?";

  return (
    <Link
      to={`/store-apps/${app.platform}/${app.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={`relative overflow-hidden bg-muted ${compact ? "aspect-[16/10]" : "aspect-[16/11]"}`}
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute left-4 right-4 bottom-4 flex items-end gap-3">
          {iconUrl || artworkUrl ? (
            <img
              src={iconUrl || artworkUrl}
              alt={`${app.name} icon`}
              className="h-16 w-16 shrink-0 rounded-2xl border border-white/30 bg-white object-cover shadow-lg"
              loading="lazy"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white text-[18px] font-bold text-slate-900 shadow-lg">
              {appInitial}
            </div>
          )}
          <div className="min-w-0 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
              {sourceLabel(app)}
            </p>
            <h3 className="truncate text-[17px] font-bold leading-tight text-white">
              {app.name}
            </h3>
            <p className="truncate text-[12px] font-medium text-white/70">
              {app.developer}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <p className="line-clamp-2 min-h-[40px] text-[13px] leading-5 text-muted-foreground">
          {app.shortDescription || app.description || app.category}
        </p>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-foreground">
              {app.category}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Star size={12} className="fill-current text-amber-500" />
              <span>{app.rating ? app.rating.toFixed(1) : "New"}</span>
              <span>{formatRatingCount(app.ratingCount)}</span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[12px] font-bold text-primary">
            {app.priceText || "Free"} <ArrowUpRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
};
