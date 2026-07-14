import { createLibrary, openLibraryDb } from "@baykus/core";
import type {
  ExternalIds,
  MetadataProvider,
  SearchResult,
  SeriesDetails,
} from "@baykus/provider-sdk";
import { ProviderError } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import type { AppDeps } from "./app.ts";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

function fixtureSeries(ref: ExternalIds): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: ref,
    title: `Show ${ref.tvmazeId ?? ref.tmdbId ?? "?"}`,
    seasons: [
      {
        number: 1,
        episodes: [{ seasonNumber: 1, episodeNumber: 1, title: "Pilot", airDate: "2020-01-01" }],
      },
    ],
  };
}

function createFakeProvider(
  opts: { searchResults?: SearchResult[]; searchError?: Error; detailsError?: Error } = {},
): MetadataProvider {
  return {
    id: "fake",
    mediaTypes: ["series"],
    capabilities: {
      search: true,
      details: true,
      upcoming: true,
      watchProviders: false,
      externalRatings: false,
      tags: false,
      images: true,
    },
    requiresApiKey: false,
    async search() {
      if (opts.searchError) throw opts.searchError;
      return opts.searchResults ?? [];
    },
    async getSeriesDetails(ref: ExternalIds) {
      if (opts.detailsError) throw opts.detailsError;
      return fixtureSeries(ref);
    },
    resolveImageUrl(ref: string) {
      return `https://example.test/${ref}`;
    },
  };
}

function createTestApp(deps: Partial<AppDeps> = {}) {
  const library = deps.library ?? createLibrary(openLibraryDb(":memory:").db);
  const providers = deps.providers ?? [createFakeProvider()];
  const dataDir = deps.dataDir ?? "/tmp/baykus-test";
  const vapid = deps.vapid ?? { publicKey: "test-public", privateKey: "test-private" };
  return createApp(loadConfig({}), { library, providers, dataDir, vapid });
}

const MUTATION_HEADERS = { "content-type": "application/json", "X-Baykus": "1" };

describe("server app", () => {
  it("GET /api/health reports ok and mode", async () => {
    const app = createTestApp();
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, mode: "single", version: "0.1.0" });
  });

  it("config defaults are single mode, port 4004, scrapers off", () => {
    const config = loadConfig({});
    expect(config.BAYKUS_MODE).toBe("single");
    expect(config.PORT).toBe(4004);
    expect(config.BAYKUS_ENABLE_SCRAPERS).toBe("0");
  });

  describe("GET /api/search", () => {
    it("happy path returns provider results", async () => {
      const results: SearchResult[] = [
        {
          providerId: "fake",
          mediaType: "series",
          externalIds: { tvmazeId: 44778, imdbId: "tt11198330" },
          title: "House of the Dragon",
          year: 2022,
          network: "HBO",
          score: 0.98,
        },
      ];
      const app = createTestApp({ providers: [createFakeProvider({ searchResults: results })] });

      const res = await app.request("/api/search?q=dragon");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ items: results, total: 1 });
    });

    it("provider failure maps to a 502 PROVIDER_ERROR envelope", async () => {
      const app = createTestApp({
        providers: [
          createFakeProvider({ searchError: new ProviderError("fake", "NETWORK", "boom") }),
        ],
      });

      const res = await app.request("/api/search?q=dragon");
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({
        error: {
          code: "PROVIDER_ERROR",
          message: "[fake] NETWORK: boom",
          details: { provider: "fake", code: "NETWORK" },
        },
      });
    });

    it("rejects a too-short query with 400 VALIDATION_FAILED", async () => {
      const app = createTestApp();
      const res = await app.request("/api/search?q=");
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  describe("POST /api/library/series", () => {
    it("returns 403 when X-Baykus header is missing", async () => {
      const app = createTestApp();
      const res = await app.request("/api/library/series", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ externalIds: { tvmazeId: 1 } }),
      });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: { code: "FORBIDDEN", message: "missing X-Baykus header", details: null },
      });
    });

    it("adds a series (201) then rejects a duplicate add (409 with existing itemId)", async () => {
      const app = createTestApp();
      const body = JSON.stringify({ externalIds: { tvmazeId: 1 }, status: "watching" });

      const first = await app.request("/api/library/series", {
        method: "POST",
        headers: MUTATION_HEADERS,
        body,
      });
      expect(first.status).toBe(201);
      const created = (await first.json()) as { id: number; title: string };
      expect(created.title).toBe("Show 1");

      const second = await app.request("/api/library/series", {
        method: "POST",
        headers: MUTATION_HEADERS,
        body,
      });
      expect(second.status).toBe(409);
      expect(await second.json()).toEqual({
        error: {
          code: "CONFLICT",
          message: expect.stringContaining("already in library"),
          details: { itemId: created.id },
        },
      });
    });
  });

  describe("GET /api/library/series", () => {
    it("filters by status", async () => {
      const app = createTestApp();
      await app.request("/api/library/series", {
        method: "POST",
        headers: MUTATION_HEADERS,
        body: JSON.stringify({ externalIds: { tvmazeId: 1 }, status: "watching" }),
      });
      await app.request("/api/library/series", {
        method: "POST",
        headers: MUTATION_HEADERS,
        body: JSON.stringify({ externalIds: { tvmazeId: 2 }, status: "completed" }),
      });

      const watching = await app.request("/api/library/series?status=watching");
      expect(watching.status).toBe(200);
      expect(await watching.json()).toMatchObject({ total: 1 });

      const all = await app.request("/api/library/series");
      expect(await all.json()).toMatchObject({ total: 2 });
    });
  });

  describe("PATCH /api/library/series/:id", () => {
    it("updates status and returns the updated summary", async () => {
      const app = createTestApp();
      const created = await app.request("/api/library/series", {
        method: "POST",
        headers: MUTATION_HEADERS,
        body: JSON.stringify({ externalIds: { tvmazeId: 1 }, status: "watching" }),
      });
      const { id } = (await created.json()) as { id: number };

      const res = await app.request(`/api/library/series/${id}`, {
        method: "PATCH",
        headers: MUTATION_HEADERS,
        body: JSON.stringify({ status: "completed" }),
      });
      expect(res.status).toBe(200);
      expect((await res.json()) as { status: string }).toMatchObject({ status: "completed" });
    });

    it("404s for an unknown id", async () => {
      const app = createTestApp();
      const res = await app.request("/api/library/series/999", {
        method: "PATCH",
        headers: MUTATION_HEADERS,
        body: JSON.stringify({ status: "completed" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET/DELETE /api/library/series/:id", () => {
    it("404s for an unknown id and 204s a successful delete", async () => {
      const app = createTestApp();
      const missing = await app.request("/api/library/series/999");
      expect(missing.status).toBe(404);

      const created = await app.request("/api/library/series", {
        method: "POST",
        headers: MUTATION_HEADERS,
        body: JSON.stringify({ externalIds: { tvmazeId: 1 }, status: "watching" }),
      });
      const { id } = (await created.json()) as { id: number };

      const detail = await app.request(`/api/library/series/${id}`);
      expect(detail.status).toBe(200);

      const del = await app.request(`/api/library/series/${id}`, {
        method: "DELETE",
        headers: { "X-Baykus": "1" },
      });
      expect(del.status).toBe(204);

      const goneAgain = await app.request(`/api/library/series/${id}`, {
        method: "DELETE",
        headers: { "X-Baykus": "1" },
      });
      expect(goneAgain.status).toBe(404);
    });
  });
});
