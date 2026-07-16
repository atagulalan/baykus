import { createLibrary, openLibraryDb } from "@baykus/core";
import type { SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";

/** Server calls getStats() with no tz yet (M48 wires ?tz=) — bucketing defaults to UTC. */
function currentAndNextUtcMonth(): [string, string] {
  const now = new Date();
  const toYyyyMm = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return [toYyyyMm(now), toYyyyMm(next)];
}

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
    const [currentMonth, nextMonth] = currentAndNextUtcMonth();
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
      seriesCount: 0,
      favoritesCount: 0,
      datedWatches: { dated: 0, total: 0 },
      mostWatchedByTime: [],
      favoriteProgress: [],
      production: { ongoing: 0, ended: 0, ongoingItems: [] },
      genreDistribution: { top: [], other: 0 },
      networkDistribution: { networkCount: 0, top: [], other: 0 },
      backlog: { episodes: 0, seriesCount: 0, watchTimeMin: 0, topSeries: [] },
      rewatchSummary: { totalRewatches: 0, rewatchedEpisodes: 0, bySeries: [] },
      recent: {
        last7Days: { episodes: 0, watchTimeMin: 0 },
        last30Days: { episodes: 0, watchTimeMin: 0 },
        thisMonth: { episodes: 0, watchTimeMin: 0 },
      },
      pace: null,
      upcoming: {
        months: [
          { month: currentMonth, episodes: 0, watchTimeMin: 0 },
          { month: nextMonth, episodes: 0, watchTimeMin: 0 },
        ],
      },
      binges: [],
      streaks: { longestWeeks: 0, currentWeeks: 0, bySeries: [] },
      timeByYear: [],
      activityByDay: [],
      byWeekday: [0, 0, 0, 0, 0, 0, 0],
      byHour: new Array(24).fill(0),
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

  it("buckets by the ?tz= zone (E96)", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries());
    const detail = library.getSeries(summary.id);
    const ep1 = detail?.seasons[0]?.episodes[0]?.id;
    if (ep1 === undefined) throw new Error("setup: fixture episode missing");
    // 21:30 UTC = 00:30 the next day in Europe/Istanbul (fixed UTC+3, no DST).
    library.addWatch(ep1, "2026-01-15T21:30:00Z");
    const app = createApp(loadConfig({}), {
      library,
      providers: [],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
    });

    const utcRes = await app.request("/api/stats", { headers: { "X-Baykus": "1" } });
    const utcBody = (await utcRes.json()) as { activityByDay: { date: string }[] };
    expect(utcBody.activityByDay).toEqual([{ date: "2026-01-15", count: 1 }]);

    const istRes = await app.request("/api/stats?tz=Europe/Istanbul", {
      headers: { "X-Baykus": "1" },
    });
    const istBody = (await istRes.json()) as { activityByDay: { date: string }[] };
    expect(istBody.activityByDay).toEqual([{ date: "2026-01-16", count: 1 }]);
  });

  it("an invalid tz is never an error — falls back to UTC (E96)", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries());
    const detail = library.getSeries(summary.id);
    const ep1 = detail?.seasons[0]?.episodes[0]?.id;
    if (ep1 === undefined) throw new Error("setup: fixture episode missing");
    library.addWatch(ep1, "2026-01-15T21:30:00Z");
    const app = createApp(loadConfig({}), {
      library,
      providers: [],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
    });

    const res = await app.request("/api/stats?tz=Not/A/Real/Zone", {
      headers: { "X-Baykus": "1" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { activityByDay: { date: string }[] };
    expect(body.activityByDay).toEqual([{ date: "2026-01-15", count: 1 }]); // UTC fallback
  });
});
