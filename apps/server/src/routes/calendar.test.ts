import { createLibrary, openLibraryDb } from "@baykus/core";
import type { SeriesDetails } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
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
  const summary = library.addSeries(fixtureSeries());
  const detail = library.getSeries(summary.id);
  // A watch on the future episode puts the item in category "watching" (active trio, E22)
  // without removing either fixture episode from the calendar (future eps always show — E24).
  const futureEpisodeId = detail?.seasons[0]?.episodes.find((ep) => ep.e === 1)?.id;
  if (futureEpisodeId === undefined) throw new Error("setup: fixture episode missing");
  library.addWatch(futureEpisodeId, new Date().toISOString());
  const app = createApp(loadConfig({}), {
    library,
    providers: [],
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return { app, itemId: summary.id };
}

describe("GET /api/calendar", () => {
  it("returns the { days } shape, both fixture dates inside the default -14/+90 window", async () => {
    const { app } = setup();
    const res = await app.request("/api/calendar");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { days: { date: string; entries: unknown[] }[] };
    expect(body.days.map((d) => d.date)).toEqual([addDays(-3), addDays(5)]);
  });

  it("accepts from/to query params", async () => {
    const { app } = setup();
    const res = await app.request(`/api/calendar?from=${addDays(0)}&to=${addDays(4)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { days: unknown[] };
    expect(body.days).toHaveLength(0); // both fixture episodes fall outside this range
  });

  it("400 VALIDATION_FAILED for a malformed date", async () => {
    const { app } = setup();
    const res = await app.request("/api/calendar?from=not-a-date");
    expect(res.status).toBe(400);
  });

  it("400 VALIDATION_FAILED when from is after to", async () => {
    const { app } = setup();
    const res = await app.request(`/api/calendar?from=${addDays(10)}&to=${addDays(5)}`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("400 VALIDATION_FAILED when the range exceeds 124 days", async () => {
    const { app } = setup();
    const res = await app.request(`/api/calendar?from=${addDays(0)}&to=${addDays(125)}`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("allows an exactly-124-day range", async () => {
    const { app } = setup();
    const res = await app.request(`/api/calendar?from=${addDays(0)}&to=${addDays(124)}`);
    expect(res.status).toBe(200);
  });
});
