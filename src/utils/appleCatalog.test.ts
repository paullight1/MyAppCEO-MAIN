import { afterEach, describe, expect, it, vi } from "vitest";
import {
  lookupAppleApp,
  mapItunesResult,
  searchAppleApps,
} from "./appleCatalog";

const sampleItem = {
  trackId: 310633997,
  trackName: "WhatsApp Messenger",
  artistName: "WhatsApp Inc.",
  primaryGenreName: "Social Networking",
  description: "Simple. Reliable. Private.",
  artworkUrl100: "https://example.com/icon100.png",
  artworkUrl512: "https://example.com/icon512.png",
  screenshotUrls: ["https://example.com/shot1.png"],
  averageUserRating: 4.7,
  userRatingCount: 100,
  formattedPrice: "Free",
  trackViewUrl: "https://apps.apple.com/us/app/whatsapp-messenger/id310633997",
  bundleId: "net.whatsapp.WhatsApp",
  version: "24.1",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mapItunesResult", () => {
  it("maps an iTunes result to an ExternalStoreApp", () => {
    const app = mapItunesResult(sampleItem);
    expect(app.id).toBe("310633997");
    expect(app.platform).toBe("ios");
    expect(app.source).toBe("apple-app-store");
    expect(app.name).toBe("WhatsApp Messenger");
    expect(app.developer).toBe("WhatsApp Inc.");
    expect(app.iconUrl).toBe("https://example.com/icon100.png");
    expect(app.artworkUrl).toBe("https://example.com/icon512.png");
    expect(app.screenshots).toEqual(["https://example.com/shot1.png"]);
    expect(app.storeUrl).toContain("id310633997");
  });

  it("falls back to the provided id and builds a store URL", () => {
    const app = mapItunesResult({ trackName: "Some App" }, "12345");
    expect(app.id).toBe("12345");
    expect(app.storeUrl).toBe("https://apps.apple.com/app/id12345");
  });
});

describe("searchAppleApps", () => {
  it("returns mapped apps from the iTunes search API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ resultCount: 1, results: [sampleItem] }),
      }),
    );

    const apps = await searchAppleApps("whatsapp");
    expect(apps).toHaveLength(1);
    expect(apps[0].name).toBe("WhatsApp Messenger");
  });

  it("returns an empty list when the API responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    expect(await searchAppleApps("whatsapp")).toEqual([]);
  });
});

describe("lookupAppleApp", () => {
  it("returns null when no result matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ resultCount: 0, results: [] }),
      }),
    );

    expect(await lookupAppleApp("999")).toBeNull();
  });

  it("returns the mapped app on a match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ resultCount: 1, results: [sampleItem] }),
      }),
    );

    const app = await lookupAppleApp("310633997");
    expect(app?.bundleId).toBe("net.whatsapp.WhatsApp");
  });
});
