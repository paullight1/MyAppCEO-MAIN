import { ConfigService } from "@nestjs/config";
import { ExternalAppsService } from "./external-apps.service";

const SEARCH_HTML = `
  <html>
    <body>
      <a href="/store/apps/details?id=com.whatsapp&amp;hl=en">WhatsApp</a>
      <a href="/store/apps/details?id=com.whatsapp&amp;hl=en">Duplicate WhatsApp</a>
    </body>
  </html>
`;

const MANY_SEARCH_HTML = `
  <html>
    <body>
      ${Array.from(
        { length: 12 },
        (_, index) =>
          `<a href="/store/apps/details?id=com.example.app${index}&amp;hl=en">App ${index}</a>`,
      ).join("\n      ")}
    </body>
  </html>
`;

const DETAIL_HTML = `
  <html>
    <head>
      <title>WhatsApp Messenger - Apps on Google Play</title>
      <meta property="og:image" content="https://play-lh.googleusercontent.com/icon" />
      <meta name="appstore:bundle_id" content="com.whatsapp" />
      <meta name="appstore:store_id" content="com.whatsapp" />
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "WhatsApp Messenger",
          "url": "https://play.google.com/store/apps/details?id=com.whatsapp",
          "description": "Simple. Reliable. Private.",
          "operatingSystem": "ANDROID",
          "applicationCategory": "COMMUNICATION",
          "image": "https://play-lh.googleusercontent.com/icon",
          "contentRating": "Everyone",
          "author": { "@type": "Person", "name": "WhatsApp LLC" },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.668187141418457",
            "ratingCount": "236282020"
          },
          "offers": [{ "@type": "Offer", "price": "0", "priceCurrency": "USD" }]
        }
      </script>
    </head>
    <body>
      <div class="bARER" data-g-id="description">
        WhatsApp from Meta is a FREE messaging app.<br />Private messaging across the world.
      </div>
      <img src="https://play-lh.googleusercontent.com/shot-1=w526-h296" alt="Screenshot image" itemprop="image" data-screenshot-index="0" />
      <img src="https://play-lh.googleusercontent.com/shot-2=w526-h296" alt="Screenshot image" itemprop="image" data-screenshot-index="1" />
      <div class="lXlx5">Updated on</div><div class="xg1aie">Jun 6, 2026</div>
    </body>
  </html>
`;

describe("ExternalAppsService Google Play public import", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createCacheService = () => {
    const store = new Map<string, unknown>();

    return {
      createKey: jest.fn((namespace: string, parts: Record<string, unknown> = {}) => {
        const serializedParts = Object.keys(parts)
          .sort()
          .filter(
            (key) =>
              parts[key] !== undefined &&
              parts[key] !== null &&
              parts[key] !== "",
          )
          .map((key) => `${key}=${encodeURIComponent(String(parts[key]))}`)
          .join("&");

        return serializedParts ? `${namespace}:${serializedParts}` : namespace;
      }),
      wrap: jest.fn(async <T>(
        key: string,
        _ttl: number,
        producer: () => Promise<T>,
      ) => {
        if (store.has(key)) {
          return store.get(key) as T;
        }

        const fresh = await producer();
        store.set(key, fresh as unknown);
        return fresh;
      }),
    };
  };

  const createService = (cacheService = createCacheService()) =>
    new ExternalAppsService(
      {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService,
      cacheService as any,
    );

  it("imports a Google Play detail page from public metadata", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(DETAIL_HTML, { status: 200 }) as any,
    );

    const app = await createService().findOne("android", "com.whatsapp", "US");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://play.google.com/store/apps/details?id=com.whatsapp&hl=en&gl=US",
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": expect.any(String) }),
      }),
    );
    expect(app).toMatchObject({
      id: "com.whatsapp",
      platform: "android",
      source: "google-play",
      name: "WhatsApp Messenger",
      developer: "WhatsApp LLC",
      category: "Communication",
      priceText: "Free",
      packageName: "com.whatsapp",
      updatedAt: "Jun 6, 2026",
      country: "US",
      locale: "en",
    });
    expect(app.description).toContain(
      "WhatsApp from Meta is a FREE messaging app.",
    );
    expect(app.screenshots).toEqual([
      "https://play-lh.googleusercontent.com/shot-1=w526-h296",
      "https://play-lh.googleusercontent.com/shot-2=w526-h296",
    ]);
    expect(app.media?.icon?.url).toBe(
      "https://play-lh.googleusercontent.com/icon",
    );
    expect(app.rating).toBeCloseTo(4.668187141418457);
    expect(app.ratingCount).toBe(236282020);
  });

  it("uses public Google Play search results to resolve exact app details", async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(SEARCH_HTML, { status: 200 }) as any)
      .mockResolvedValueOnce(new Response(DETAIL_HTML, { status: 200 }) as any);

    const result = await createService().search({
      platform: "android",
      term: "whatsapp",
      limit: 1,
    });

    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]).toMatchObject({
      id: "com.whatsapp",
      name: "WhatsApp Messenger",
    });
    expect(result.warnings).toEqual([]);
    expect(result.meta.sources).toEqual(["google-play"]);
  });

  it("caches repeated Google Play search requests", async () => {
    const cacheService = createCacheService();
    const service = createService(cacheService);

    fetchSpy
      .mockResolvedValueOnce(new Response(SEARCH_HTML, { status: 200 }) as any)
      .mockResolvedValueOnce(new Response(DETAIL_HTML, { status: 200 }) as any);

    const first = await service.search({
      platform: "android",
      term: "whatsapp",
      limit: 1,
    });
    const second = await service.search({
      platform: "android",
      term: "whatsapp",
      limit: 1,
    });

    expect(first).toEqual(second);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(cacheService.wrap).toHaveBeenCalledTimes(2);
  });

  it("caches repeated Google Play detail lookups", async () => {
    const cacheService = createCacheService();
    const service = createService(cacheService);

    fetchSpy.mockResolvedValueOnce(
      new Response(DETAIL_HTML, { status: 200 }) as any,
    );

    const first = await service.findOne("android", "com.whatsapp", "US");
    const second = await service.findOne("android", "com.whatsapp", "US");

    expect(first).toEqual(second);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(cacheService.wrap).toHaveBeenCalledTimes(2);
  });

  it("caps public Google Play search fallback work", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(MANY_SEARCH_HTML, { status: 200 }) as any,
    );

    for (let index = 0; index < 8; index += 1) {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          DETAIL_HTML.replaceAll(
            "com.whatsapp",
            `com.example.app${index}`,
          ),
          { status: 200 },
        ) as any,
      );
    }

    const result = await createService().search({
      platform: "android",
      term: "whatsapp",
      limit: 20,
    });

    expect(result.apps).toHaveLength(8);
    expect(result.meta.sources).toEqual(["google-play"]);
    expect(fetchSpy).toHaveBeenCalledTimes(9);
  });

  it("surfaces a timeout when a public Google Play request stalls", async () => {
    fetchSpy.mockRejectedValueOnce(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );

    await expect(
      createService().findOne("android", "com.whatsapp", "US"),
    ).rejects.toThrow("timed out");
  });

});
