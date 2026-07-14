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

function setup() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const summary = library.addSeries(fixtureSeries(), "watching");
  const detail = library.getSeries(summary.id);
  const ep1 = detail?.seasons[0]?.episodes[0]?.id;
  if (ep1 === undefined) throw new Error("setup: fixture episode missing");
  const app = createApp(loadConfig({}), { library, providers: [] });
  return { app, itemId: summary.id, ep1 };
}

const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };
const DELETE_HEADERS = { "X-Baykus": "1" };

describe("PUT /api/ratings", () => {
  it("happy path upserts and returns the rating", async () => {
    const { app, itemId } = setup();
    const res = await app.request("/api/ratings", {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify({ targetType: "item", targetId: itemId, value: 3 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ targetType: "item", targetId: itemId, value: 3 });
  });

  it("second PUT overwrites the value", async () => {
    const { app, ep1 } = setup();
    const body = (value: number) => JSON.stringify({ targetType: "episode", targetId: ep1, value });

    await app.request("/api/ratings", { method: "PUT", headers: HEADERS, body: body(1) });
    const res = await app.request("/api/ratings", {
      method: "PUT",
      headers: HEADERS,
      body: body(2),
    });
    expect(await res.json()).toMatchObject({ value: 2 });
  });

  it("400 VALIDATION_FAILED for an out-of-range value", async () => {
    const { app, itemId } = setup();
    const res = await app.request("/api/ratings", {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify({ targetType: "item", targetId: itemId, value: 4 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("400 VALIDATION_FAILED for an unknown targetType", async () => {
    const { app, itemId } = setup();
    const res = await app.request("/api/ratings", {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify({ targetType: "series", targetId: itemId, value: 2 }),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/ratings/:targetType/:targetId", () => {
  it("happy path removes an existing rating (204)", async () => {
    const { app, itemId } = setup();
    await app.request("/api/ratings", {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify({ targetType: "item", targetId: itemId, value: 3 }),
    });

    const res = await app.request(`/api/ratings/item/${itemId}`, {
      method: "DELETE",
      headers: DELETE_HEADERS,
    });
    expect(res.status).toBe(204);
  });

  it("404 when there is nothing to remove", async () => {
    const { app, itemId } = setup();
    const res = await app.request(`/api/ratings/item/${itemId}`, {
      method: "DELETE",
      headers: DELETE_HEADERS,
    });
    expect(res.status).toBe(404);
  });
});
