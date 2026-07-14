import { createLibrary, openLibraryDb } from "@baykus/core";
import { type MetadataProvider, ProviderError, type SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";
import { readSseEvents } from "./sse-test-util.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fixtureSeries(tvmazeId: number): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvmazeId },
    title: "Test Show",
    seasons: [
      {
        number: 1,
        episodes: [{ seasonNumber: 1, episodeNumber: 1, title: "Pilot", airDate: addDays(-10) }],
      },
    ],
  };
}

function fakeProvider(opts: { detailsError?: Error } = {}): MetadataProvider {
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
      return [];
    },
    async getSeriesDetails(ref) {
      if (opts.detailsError) throw opts.detailsError;
      const ids = ref as { tvmazeId?: number };
      return fixtureSeries(ids.tvmazeId ?? 1);
    },
    resolveImageUrl() {
      return "";
    },
  };
}

function setup(providers: MetadataProvider[] = [fakeProvider()]) {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const summary = library.addSeries(fixtureSeries(1), "watching");
  const app = createApp(loadConfig({}), {
    library,
    providers,
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return { app, itemId: summary.id, library };
}

const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };

describe("POST /api/library/series/:id/refresh", () => {
  it("happy path returns ok + newEpisodes + refreshedAt", async () => {
    const { app, itemId } = setup();
    const res = await app.request(`/api/library/series/${itemId}/refresh`, {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { itemId: number; ok: boolean; newEpisodes: number };
    expect(body.itemId).toBe(itemId);
    expect(body.ok).toBe(true);
  });

  it("404 NOT_FOUND for an unknown series", async () => {
    const { app } = setup();
    const res = await app.request("/api/library/series/999999/refresh", {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(404);
  });

  it("502 PROVIDER_ERROR when the provider fails", async () => {
    const { app, itemId } = setup([
      fakeProvider({ detailsError: new ProviderError("fake", "NETWORK", "boom") }),
    ]);
    const res = await app.request(`/api/library/series/${itemId}/refresh`, {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PROVIDER_ERROR");
  });
});

describe("POST /api/library/refresh (SSE)", () => {
  it("streams a progress event per item then a complete event", async () => {
    const { app } = setup();
    const res = await app.request("/api/library/refresh", { method: "POST", headers: HEADERS });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = await readSseEvents(res);
    const progress = events.filter((e) => e.event === "progress");
    const complete = events.filter((e) => e.event === "complete");
    expect(progress).toHaveLength(1);
    expect(progress[0]?.data).toMatchObject({ done: 1, total: 1, ok: true });
    expect(complete).toHaveLength(1);
    expect(complete[0]?.data).toMatchObject({ ok: 1, failed: 0 });
  });
});
