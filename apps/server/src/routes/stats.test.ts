import { createLibrary, openLibraryDb } from "@baykus/core";
import type { SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";

function fixtureSeries(): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvmazeId: 1 },
    title: "Test Show",
    seasons: [
      {
        number: 1,
        episodes: [{ seasonNumber: 1, episodeNumber: 1, title: "Pilot", airDate: "2026-01-01" }],
      },
    ],
  };
}

describe("GET /api/stats", () => {
  it("returns the full shape with zeroed defaults on an empty library", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const app = createApp(loadConfig({}), {
      library,
      providers: [],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
    });

    const res = await app.request("/api/stats", { headers: { "X-Baykus": "1" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      episodesWatched: 0,
      watchTimeMin: 0,
      itemCount: { watching: 0, plan_to_watch: 0, completed: 0, dropped: 0, paused: 0 },
      episodesPerMonth: [],
      ratingDistribution: { "1": 0, "2": 0, "3": 0 },
    });
  });

  it("reflects watches and item counts after activity", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries(), "watching");
    const detail = library.getSeries(summary.id);
    const ep1 = detail?.seasons[0]?.episodes[0]?.id;
    if (ep1 === undefined) throw new Error("setup: fixture episode missing");
    library.addWatch(ep1, "2026-01-05T00:00:00Z");
    const app = createApp(loadConfig({}), {
      library,
      providers: [],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
    });

    const res = await app.request("/api/stats", { headers: { "X-Baykus": "1" } });
    const body = await res.json();
    expect(body).toMatchObject({
      episodesWatched: 1,
      itemCount: { watching: 1, plan_to_watch: 0, completed: 0, dropped: 0, paused: 0 },
      episodesPerMonth: [{ month: "2026-01", count: 1 }],
    });
  });
});
