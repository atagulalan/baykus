import { createLibrary, openLibraryDb } from "@baykus/core";
import type { SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
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
      auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
    });

    const res = await app.request("/api/stats", { headers: { "X-Baykus": "1" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      episodesWatched: 0,
      watchTimeMin: 0,
      itemCount: {
        needs_review: 0,
        watching: 0,
        not_watched_recently: 0,
        not_started: 0,
        watch_later: 0,
        up_to_date: 0,
        finished: 0,
        stopped: 0,
      },
      episodesPerMonth: [],
      ratingDistribution: { "1": 0, "2": 0, "3": 0 },
      mostRewatched: [],
    });
  });

  it("reflects watches and item counts after activity", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries());
    const detail = library.getSeries(summary.id);
    const ep1 = detail?.seasons[0]?.episodes[0]?.id;
    if (ep1 === undefined) throw new Error("setup: fixture episode missing");
    library.addWatch(ep1, "2026-01-05T00:00:00Z");
    const app = createApp(loadConfig({}), {
      library,
      providers: [],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
    });

    const res = await app.request("/api/stats", { headers: { "X-Baykus": "1" } });
    const body = await res.json();
    // Fixture's only episode is aired and now fully watched, releaseStatus unset -> "finished" (E18).
    expect(body).toMatchObject({
      episodesWatched: 1,
      itemCount: { finished: 1 },
      episodesPerMonth: [{ month: "2026-01", count: 1 }],
    });
  });
});
