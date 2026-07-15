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
    seasons: [
      {
        number: 0,
        episodes: [{ seasonNumber: 0, episodeNumber: 1, title: "Special", airDate: addDays(-30) }],
      },
      {
        number: 1,
        episodes: [
          { seasonNumber: 1, episodeNumber: 1, title: "Pilot", airDate: addDays(-10) },
          { seasonNumber: 1, episodeNumber: 2, title: "Ep2", airDate: addDays(-5) },
        ],
      },
    ],
  };
}

function setup() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const summary = library.addSeries(fixtureSeries());
  const detail = library.getSeries(summary.id);
  if (!detail) throw new Error("setup: series vanished");
  const app = createApp(loadConfig({}), {
    library,
    providers: [],
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });

  const special = detail.seasons.find((s) => s.number === 0);
  const season1 = detail.seasons.find((s) => s.number === 1);
  const specialEpisodeId = special?.episodes[0]?.id;
  const ep1 = season1?.episodes[0]?.id;
  const ep2 = season1?.episodes[1]?.id;
  if (specialEpisodeId === undefined || ep1 === undefined || ep2 === undefined) {
    throw new Error("setup: fixture episodes missing");
  }
  return { app, itemId: summary.id, specialEpisodeId, ep1, ep2 };
}

const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };
const DELETE_HEADERS = { "X-Baykus": "1" };

describe("POST /api/episodes/:id/watches", () => {
  it("happy path creates a watch (201) with no suggestCompleted key", async () => {
    const { app, ep1 } = setup();
    const res = await app.request(`/api/episodes/${ep1}/watches`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ episodeId: ep1, source: "manual" });
    expect(body).not.toHaveProperty("suggestCompleted");
  });

  it("duplicate (episodeId, watchedAt) is idempotent -> 200 with the existing watch", async () => {
    const { app, ep1 } = setup();
    const body = JSON.stringify({ watchedAt: "2026-01-01T10:00:00Z" });

    const first = await app.request(`/api/episodes/${ep1}/watches`, {
      method: "POST",
      headers: HEADERS,
      body,
    });
    expect(first.status).toBe(201);
    const firstBody = await first.json();

    const second = await app.request(`/api/episodes/${ep1}/watches`, {
      method: "POST",
      headers: HEADERS,
      body,
    });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(firstBody);
  });

  it("400 VALIDATION_FAILED on a malformed body", async () => {
    const { app, ep1 } = setup();
    const res = await app.request(`/api/episodes/${ep1}/watches`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ watchedAt: 12345 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("404 NOT_FOUND for an unknown episode", async () => {
    const { app } = setup();
    const res = await app.request("/api/episodes/999999/watches", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/episodes/:id/watches/latest", () => {
  it("happy path removes the latest watch (204)", async () => {
    const { app, ep1 } = setup();
    await app.request(`/api/episodes/${ep1}/watches`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });

    const res = await app.request(`/api/episodes/${ep1}/watches/latest`, {
      method: "DELETE",
      headers: DELETE_HEADERS,
    });
    expect(res.status).toBe(204);
  });

  it("404 when there is nothing to remove", async () => {
    const { app, ep1 } = setup();
    const res = await app.request(`/api/episodes/${ep1}/watches/latest`, {
      method: "DELETE",
      headers: DELETE_HEADERS,
    });
    expect(res.status).toBe(404);
  });

  it("404 for an unknown episode", async () => {
    const { app } = setup();
    const res = await app.request("/api/episodes/999999/watches/latest", {
      method: "DELETE",
      headers: DELETE_HEADERS,
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/library/series/:id/watches/bulk", () => {
  it("happy path (seasonNumber) reports created/skippedAlreadyWatched, no suggestCompleted", async () => {
    const { app, itemId, ep1 } = setup();
    await app.request(`/api/episodes/${ep1}/watches`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });

    const res = await app.request(`/api/library/series/${itemId}/watches/bulk`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ seasonNumber: 1 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: 1, skippedAlreadyWatched: 1 });
  });

  it("400 when both upToEpisodeId and seasonNumber are given (XOR)", async () => {
    const { app, itemId, ep1 } = setup();
    const res = await app.request(`/api/library/series/${itemId}/watches/bulk`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ upToEpisodeId: ep1, seasonNumber: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it("400 when neither field is given", async () => {
    const { app, itemId } = setup();
    const res = await app.request(`/api/library/series/${itemId}/watches/bulk`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("404 for an unknown series", async () => {
    const { app } = setup();
    const res = await app.request("/api/library/series/999999/watches/bulk", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ seasonNumber: 1 }),
    });
    expect(res.status).toBe(404);
  });
});
