import { createLibrary, openLibraryDb } from "@baykus/core";
import type { SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fixtureSeries(): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvmazeId: 1 },
    title: "Test Show",
    networks: [{ name: "HBO" }],
    seasons: [
      {
        number: 1,
        episodes: [
          { seasonNumber: 1, episodeNumber: 1, title: "Ep1", airDate: addDays(5) },
          { seasonNumber: 1, episodeNumber: 2, title: "Ep2", airDate: addDays(-3) },
        ],
      },
    ],
  };
}

function setup() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const summary = library.addSeries(fixtureSeries(), "watching");
  const app = createApp(loadConfig({}), { library, providers: [], dataDir: "/tmp/baykus-test" });
  return { app, itemId: summary.id };
}

describe("GET /api/calendar", () => {
  it("returns upcoming grouped by date and recentlyAired unwatched", async () => {
    const { app } = setup();
    const res = await app.request("/api/calendar");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      upcoming: { date: string; entries: unknown[] }[];
      recentlyAired: { airDate: string }[];
    };
    expect(body.upcoming).toHaveLength(1);
    expect(body.upcoming[0]?.date).toBe(addDays(5));
    expect(body.recentlyAired).toHaveLength(1);
    expect(body.recentlyAired[0]?.airDate).toBe(addDays(-3));
  });

  it("accepts from/to query params", async () => {
    const { app } = setup();
    const res = await app.request(`/api/calendar?from=${addDays(0)}&to=${addDays(4)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { upcoming: unknown[] };
    expect(body.upcoming).toHaveLength(0); // the only upcoming episode airs on day 5, outside this range
  });

  it("400 VALIDATION_FAILED for a malformed date", async () => {
    const { app } = setup();
    const res = await app.request("/api/calendar?from=not-a-date");
    expect(res.status).toBe(400);
  });
});
