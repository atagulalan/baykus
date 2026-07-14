import type { ExternalRating, MetadataProvider } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { enrichExternalRatings } from "./enrich.ts";

function fakeProvider(
  id: string,
  opts: { externalRatings?: boolean; ratings?: ExternalRating[]; error?: Error } = {},
): MetadataProvider {
  return {
    id,
    mediaTypes: ["series"],
    capabilities: {
      search: true,
      details: true,
      upcoming: true,
      watchProviders: false,
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
