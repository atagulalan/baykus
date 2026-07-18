import type {
  CastMember,
  ExternalRating,
  MetadataProvider,
  TagInfo,
  WatchProviderInfo,
} from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { enrichCast, enrichExternalRatings, enrichTags, enrichWatchProviders } from "./enrich.ts";

function fakeProvider(
  id: string,
  opts: {
    externalRatings?: boolean;
    ratings?: ExternalRating[];
    watchProviders?: boolean;
    providers?: WatchProviderInfo[];
    tags?: boolean;
    tagList?: TagInfo[];
    credits?: boolean;
    castList?: CastMember[];
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
      tags: opts.tags ?? false,
      images: true,
      credits: opts.credits ?? false,
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
    ...(opts.tags
      ? {
          async getTags() {
            if (opts.error) throw opts.error;
            return opts.tagList ?? [];
          },
        }
      : {}),
    ...(opts.credits
      ? {
          async getCredits() {
            if (opts.error) throw opts.error;
            return opts.castList ?? [];
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

describe("enrichTags", () => {
  it("merges tags from every capable provider", async () => {
    const a = fakeProvider("a", {
      tags: true,
      tagList: [{ source: "a", name: "🏛️ Politics" }],
    });
    const b = fakeProvider("b"); // tags: false — skipped entirely

    const merged = await enrichTags([a, b], { tmdbId: 1 });
    expect(merged).toEqual([{ source: "a", name: "🏛️ Politics" }]);
  });

  it("a failing provider is skipped, never fatal", async () => {
    const broken = fakeProvider("broken", { tags: true, error: new Error("boom") });
    const merged = await enrichTags([broken], { tmdbId: 1 });
    expect(merged).toEqual([]);
  });

  it("returns [] when no provider supports tags", async () => {
    const merged = await enrichTags([fakeProvider("a")], { tmdbId: 1 });
    expect(merged).toEqual([]);
  });
});

describe("enrichCast", () => {
  it("merges cast from every capable provider", async () => {
    const a = fakeProvider("a", {
      credits: true,
      castList: [{ id: 1, name: "Emma D'Arcy", character: "Rhaenyra", order: 0 }],
    });
    const b = fakeProvider("b"); // credits: false — skipped entirely

    const merged = await enrichCast([a, b], { tmdbId: 1 });
    expect(merged).toEqual([{ id: 1, name: "Emma D'Arcy", character: "Rhaenyra", order: 0 }]);
  });

  it("a failing provider is skipped, never fatal", async () => {
    const broken = fakeProvider("broken", { credits: true, error: new Error("boom") });
    const merged = await enrichCast([broken], { tmdbId: 1 });
    expect(merged).toEqual([]);
  });

  it("returns [] when no provider supports credits", async () => {
    const merged = await enrichCast([fakeProvider("a")], { tmdbId: 1 });
    expect(merged).toEqual([]);
  });
});
