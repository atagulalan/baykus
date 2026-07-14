import type { ExternalRating, MetadataProvider, WatchProviderInfo } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { enrichExternalRatings, enrichWatchProviders } from "./enrich.ts";

function fakeProvider(
  id: string,
  opts: {
    externalRatings?: boolean;
    ratings?: ExternalRating[];
    watchProviders?: boolean;
    providers?: WatchProviderInfo[];
    error?: Error;
  } = {},
): MetadataProvider {
  return {
    id,
    mediaTypes: ["series"],
    capabilities: {
      search: true,
      details: true,
      upcoming: true,
      watchProviders: opts.watchProviders ?? false,
      externalRatings: opts.externalRatings ?? false,
      tags: false,
      images: true,
    },
    requiresApiKey: false,
    async search() {
      return [];
    },
    async getSeriesDetails() {
      throw new Error("not used in this test");
    },
    resolveImageUrl() {
      return "";
    },
    ...(opts.externalRatings
      ? {
          async getExternalRatings() {
            if (opts.error) throw opts.error;
            return opts.ratings ?? [];
          },
        }
      : {}),
    ...(opts.watchProviders
      ? {
          async getWatchProviders() {
            if (opts.error) throw opts.error;
            return opts.providers ?? [];
          },
        }
      : {}),
  };
}

describe("enrichExternalRatings", () => {
  it("merges ratings from every capable provider", async () => {
    const a = fakeProvider("a", {
      externalRatings: true,
      ratings: [{ source: "a", value: 8, scale: 10, fetchedAt: "2026-01-01T00:00:00Z" }],
    });
    const b = fakeProvider("b", {
      externalRatings: true,
      ratings: [{ source: "b", value: 4, scale: 5, fetchedAt: "2026-01-01T00:00:00Z" }],
    });
    const c = fakeProvider("c"); // externalRatings: false — skipped entirely

    const merged = await enrichExternalRatings([a, b, c], { tmdbId: 1 });

    expect(merged).toEqual([
      { source: "a", value: 8, scale: 10, fetchedAt: "2026-01-01T00:00:00Z" },
      { source: "b", value: 4, scale: 5, fetchedAt: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("a failing provider is skipped, never fatal", async () => {
    const ok = fakeProvider("ok", {
      externalRatings: true,
      ratings: [{ source: "ok", value: 7, scale: 10, fetchedAt: "2026-01-01T00:00:00Z" }],
    });
    const broken = fakeProvider("broken", { externalRatings: true, error: new Error("boom") });

    const merged = await enrichExternalRatings([ok, broken], { tmdbId: 1 });

    expect(merged).toEqual([
      { source: "ok", value: 7, scale: 10, fetchedAt: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("returns [] when no provider supports external ratings", async () => {
    const merged = await enrichExternalRatings([fakeProvider("a")], { tmdbId: 1 });
    expect(merged).toEqual([]);
  });
});

describe("enrichWatchProviders", () => {
  it("merges watch providers for the requested region", async () => {
    const a = fakeProvider("a", {
      watchProviders: true,
      providers: [{ provider: "HBO Max", type: "flatrate", region: "TR" }],
    });
    const b = fakeProvider("b"); // watchProviders: false — skipped entirely

    const merged = await enrichWatchProviders([a, b], { tmdbId: 1 }, "TR");

    expect(merged).toEqual([{ provider: "HBO Max", type: "flatrate", region: "TR" }]);
  });

  it("a failing provider is skipped, never fatal", async () => {
    const broken = fakeProvider("broken", { watchProviders: true, error: new Error("boom") });
    const merged = await enrichWatchProviders([broken], { tmdbId: 1 }, "TR");
    expect(merged).toEqual([]);
  });

  it("returns [] when no provider supports watch providers", async () => {
    const merged = await enrichWatchProviders([fakeProvider("a")], { tmdbId: 1 }, "TR");
    expect(merged).toEqual([]);
  });
});
