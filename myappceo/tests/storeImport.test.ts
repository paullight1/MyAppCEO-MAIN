import { describe, expect, it } from "vitest";
import type { ExternalStoreApp } from "../src/types/externalApp";
import {
  buildStoreImportSnapshot,
  getStoreArtworkUrl,
  getStoreIconUrl,
  getStoreScreenshotUrls,
  parseStoreAppReference,
  toStoreProvider,
} from "../src/utils/storeImport";

describe("parseStoreAppReference", () => {
  it.each([
    [
      "Apple App Store URL",
      "https://apps.apple.com/us/app/sky-notes/id123456789?uo=4",
      { platform: "ios" as const, id: "123456789" },
    ],
    [
      "Apple itunes.apple.com URL",
      "https://itunes.apple.com/us/app/sky-notes/id987654321?mt=8",
      { platform: "ios" as const, id: "987654321" },
    ],
    [
      "Google Play URL",
      "https://play.google.com/store/apps/details?id=com.sky.notes&hl=en",
      { platform: "android" as const, id: "com.sky.notes" },
    ],
    [
      "raw iOS app ID",
      "123456789",
      { platform: "ios" as const, id: "123456789" },
    ],
    [
      "raw Android package ID",
      "com.sky.notes",
      { platform: "android" as const, id: "com.sky.notes" },
    ],
  ])("parses %s", (_label, input, expected) => {
    expect(parseStoreAppReference(input)).toEqual(expected);
  });
});

describe("store import snapshot helpers", () => {
  const iosApp: ExternalStoreApp = {
    id: "123456789",
    platform: "ios",
    source: "apple-app-store",
    country: "US",
    locale: "en-US",
    fetchedAt: "2026-06-01T10:00:00.000Z",
    name: "Sky Notes",
    developer: "Sky Labs Ltd",
    category: "Productivity",
    description: "Capture ideas, tasks, and team notes.",
    shortDescription: "  Capture ideas, tasks,\nand team notes.  ",
    iconUrl: "https://cdn.example.com/ios/icon-flat.png",
    artworkUrl: "https://cdn.example.com/ios/artwork-flat.png",
    screenshots: [
      "https://cdn.example.com/ios/shot-1.png",
      "https://cdn.example.com/ios/shot-2.png",
    ],
    rating: 4.9,
    ratingCount: 2048,
    priceText: "Free",
    storeUrl: "https://apps.apple.com/us/app/sky-notes/id123456789?uo=4",
    bundleId: "com.skylabs.skynotes",
    releaseDate: "2025-03-10T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
    contentRating: "4+",
    version: "3.1.0",
    rawMetadata: {
      trackId: 123456789,
      trackName: "Sky Notes",
      genreIds: ["6007"],
    },
  };

  const androidApp: ExternalStoreApp = {
    id: "com.sky.notes",
    platform: "android",
    source: "google-play",
    country: "NG",
    locale: "en",
    fetchedAt: "2026-06-02T10:00:00.000Z",
    name: "Sky Notes",
    developer: "Sky Labs Ltd",
    category: "Business productivity",
    description: "Fast notes for teams with sync across devices.",
    shortDescription: "  Fast notes for teams\nwith sync across devices.  ",
    iconUrl: "",
    artworkUrl: "",
    screenshots: [],
    rating: 4.7,
    ratingCount: 1234,
    priceText: "Free",
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.sky.notes&hl=en",
    packageName: "com.sky.notes",
    releaseDate: "2025-06-14T00:00:00.000Z",
    updatedAt: "2026-05-28T00:00:00.000Z",
    contentRating: "Everyone",
    version: "2.4.0",
    media: {
      icon: {
        url: "https://cdn.example.com/android/icon-media.png",
        width: 512,
        height: 512,
        title: "App icon",
      },
      artwork: {
        url: "https://cdn.example.com/android/artwork-media.png",
        width: 1024,
        height: 500,
        title: "Feature graphic",
      },
      screenshots: [
        {
          url: "https://cdn.example.com/android/shot-1.png",
          locale: "en-US",
          device: "phone",
        },
        {
          url: "https://cdn.example.com/android/shot-2.png",
          locale: "en-US",
          device: "tablet",
        },
      ],
    },
    rawMetadata: {
      appId: "com.sky.notes",
      categorySlug: "business",
      tracks: ["production"],
    },
  };

  it("builds a complete Apple App Store snapshot from iOS-shaped input", () => {
    const snapshot = buildStoreImportSnapshot(iosApp);

    expect(toStoreProvider(iosApp.source)).toBe("apple_app_store");
    expect(getStoreIconUrl(iosApp)).toBe(iosApp.iconUrl);
    expect(getStoreArtworkUrl(iosApp)).toBe(iosApp.artworkUrl);
    expect(getStoreScreenshotUrls(iosApp)).toEqual(iosApp.screenshots);

    expect(snapshot).toMatchObject({
      source: "apple-app-store",
      platform: "ios",
      provider: "apple_app_store",
      storeId: "123456789",
      storeUrl: iosApp.storeUrl,
      name: iosApp.name,
      developer: iosApp.developer,
      category: iosApp.category,
      iconUrl: iosApp.iconUrl,
      artworkUrl: iosApp.artworkUrl,
      screenshots: iosApp.screenshots,
      bundleId: iosApp.bundleId,
      country: iosApp.country,
      locale: iosApp.locale,
      fetchedAt: iosApp.fetchedAt,
      rawMetadata: iosApp.rawMetadata,
    });

    expect(snapshot.shortDescription).toBe(
      "Capture ideas, tasks, and team notes.",
    );
    expect(snapshot.metadata).toMatchObject({
      source: "apple-app-store",
      platform: "ios",
      provider: "apple_app_store",
      storeId: "123456789",
      storeUrl: iosApp.storeUrl,
      iconUrl: iosApp.iconUrl,
      artworkUrl: iosApp.artworkUrl,
      screenshots: iosApp.screenshots,
      bundleId: iosApp.bundleId,
      rawMetadata: iosApp.rawMetadata,
    });
    expect(snapshot.metadata.rawMetadata).toEqual(iosApp.rawMetadata);
  });

  it("builds a complete Google Play snapshot from Android-shaped input", () => {
    const snapshot = buildStoreImportSnapshot(androidApp);

    expect(toStoreProvider(androidApp.source)).toBe("google_play");
    expect(getStoreIconUrl(androidApp)).toBe(
      "https://cdn.example.com/android/icon-media.png",
    );
    expect(getStoreArtworkUrl(androidApp)).toBe(
      "https://cdn.example.com/android/artwork-media.png",
    );
    expect(getStoreScreenshotUrls(androidApp)).toEqual([
      "https://cdn.example.com/android/shot-1.png",
      "https://cdn.example.com/android/shot-2.png",
    ]);

    expect(snapshot).toMatchObject({
      source: "google-play",
      platform: "android",
      provider: "google_play",
      storeId: "com.sky.notes",
      storeUrl: androidApp.storeUrl,
      name: androidApp.name,
      developer: androidApp.developer,
      category: androidApp.category,
      iconUrl: "https://cdn.example.com/android/icon-media.png",
      artworkUrl: "https://cdn.example.com/android/artwork-media.png",
      screenshots: [
        "https://cdn.example.com/android/shot-1.png",
        "https://cdn.example.com/android/shot-2.png",
      ],
      packageName: androidApp.packageName,
      country: androidApp.country,
      locale: androidApp.locale,
      fetchedAt: androidApp.fetchedAt,
      rawMetadata: androidApp.rawMetadata,
    });

    expect(snapshot.shortDescription).toBe(
      "Fast notes for teams with sync across devices.",
    );
    expect(snapshot.metadata).toMatchObject({
      source: "google-play",
      platform: "android",
      provider: "google_play",
      storeId: "com.sky.notes",
      storeUrl: androidApp.storeUrl,
      iconUrl: "https://cdn.example.com/android/icon-media.png",
      artworkUrl: "https://cdn.example.com/android/artwork-media.png",
      screenshots: [
        "https://cdn.example.com/android/shot-1.png",
        "https://cdn.example.com/android/shot-2.png",
      ],
      packageName: androidApp.packageName,
      rawMetadata: androidApp.rawMetadata,
    });
    expect(snapshot.metadata.rawMetadata).toEqual(androidApp.rawMetadata);
  });
});
