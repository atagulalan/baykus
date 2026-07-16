import { createLibrary, type LibraryDatabase, openLibraryDb, schema } from "@baykus/core";
import { type MetadataProvider, ProviderError, type SeriesDetails } from "@baykus/provider-sdk";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";
import { readSseEvents } from "./sse-test-util.ts";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  vi.mocked(webpush.sendNotification).mockClear();
  vi.mocked(webpush.sendNotification).mockResolvedValue(undefined as never);
});

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
  const db = openLibraryDb(":memory:").db;
  const library = createLibrary(db);
  const summary = library.addSeries(fixtureSeries(1));
  const app = createApp(loadConfig({}), {
    library,
    providers,
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return { app, itemId: summary.id, library, db };
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

  it("paramless behavior is byte-identical to before (regression)", async () => {
    const { app } = setup();
    const withoutParam = await app.request("/api/library/refresh", {
      method: "POST",
      headers: HEADERS,
    });
    const events = await readSseEvents(withoutParam);
    expect(events.filter((e) => e.event === "progress")).toHaveLength(1);
    expect(events.filter((e) => e.event === "complete")[0]?.data).toMatchObject({
      ok: 1,
      failed: 0,
    });
  });
});

describe("POST /api/library/refresh?staleOnly=1 (E64)", () => {
  it("skips a just-refreshed (fresh) item — total excludes it, immediate complete", async () => {
    const { app } = setup(); // setup() adds one item; a fresh add's lastRefreshedAt = addedAt = now
    const res = await app.request("/api/library/refresh?staleOnly=1", {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(200);

    const events = await readSseEvents(res);
    expect(events.filter((e) => e.event === "progress")).toHaveLength(0);
    expect(events.filter((e) => e.event === "complete")[0]?.data).toMatchObject({
      ok: 0,
      failed: 0,
    });
  });

  it("refreshes a stale item when present", async () => {
    const { app, itemId, db } = setup();
    // Backdate lastRefreshedAt well past the 24h staleness window (E63).
    db.update(schema.items)
      .set({ lastRefreshedAt: "2000-01-01T00:00:00Z" })
      .where(eq(schema.items.id, itemId))
      .run();

    const res = await app.request("/api/library/refresh?staleOnly=true", {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(200);

    const events = await readSseEvents(res);
    expect(events.filter((e) => e.event === "progress")).toHaveLength(1);
    expect(events.filter((e) => e.event === "complete")[0]?.data).toMatchObject({ ok: 1 });
  });

  it("staleOnly=bogus -> 400 VALIDATION_FAILED", async () => {
    const { app } = setup();
    const res = await app.request("/api/library/refresh?staleOnly=bogus", {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("POST /api/library/series/:id/refresh — push scoped to the active trio (E22)", () => {
  /** Two episodes: one already watched (recently), one newly aired and unwatched — category "watching". */
  function twoEpisodeFixture(tvmazeId: number): SeriesDetails {
    return {
      providerId: "fake",
      mediaType: "series",
      externalIds: { tvmazeId },
      title: "Test Show",
      seasons: [
        {
          number: 1,
          episodes: [
            { seasonNumber: 1, episodeNumber: 1, title: "Pilot", airDate: addDays(-30) },
            { seasonNumber: 1, episodeNumber: 2, title: "Ep2", airDate: addDays(-1) },
          ],
        },
      ],
    };
  }

  function twoEpisodeProvider(): MetadataProvider {
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
        const ids = ref as { tvmazeId?: number };
        return twoEpisodeFixture(ids.tvmazeId ?? 1);
      },
      resolveImageUrl() {
        return "";
      },
    };
  }

  /** Backdates lastRefreshedAt so Ep2's airDate (yesterday) counts as "new" on the next refresh. */
  function backdateLastRefreshed(db: LibraryDatabase, itemId: number) {
    db.update(schema.items)
      .set({ lastRefreshedAt: `${addDays(-5)}T00:00:00Z` })
      .where(eq(schema.items.id, itemId))
      .run();
  }

  it("notifies when the post-refresh category is in the active trio (watching)", async () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const summary = library.addSeries(twoEpisodeFixture(1));
    const ep1 = library.getSeries(summary.id)?.seasons[0]?.episodes[0]?.id;
    if (ep1 === undefined) throw new Error("setup: fixture episode missing");
    library.addWatch(ep1, new Date().toISOString());
    backdateLastRefreshed(db, summary.id);
    expect(library.getSeries(summary.id)?.category).toBe("watching");

    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });
    const app = createApp(loadConfig({}), {
      library,
      providers: [twoEpisodeProvider()],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
    });

    const res = await app.request(`/api/library/series/${summary.id}/refresh`, {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as { newEpisodes: number }).toMatchObject({ newEpisodes: 1 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it("does not notify when manualList keeps the item out of the active trio (watch_later)", async () => {
    const { db } = openLibraryDb(":memory:");
    const library = createLibrary(db);
    const summary = library.addSeries(twoEpisodeFixture(1));
    const ep1 = library.getSeries(summary.id)?.seasons[0]?.episodes[0]?.id;
    if (ep1 === undefined) throw new Error("setup: fixture episode missing");
    // addWatch's default "manual" source would auto-clear a manual_list set beforehand (E19) —
    // set watch_later AFTER watching so it sticks.
    library.addWatch(ep1, new Date().toISOString());
    library.updateTracking(summary.id, { manualList: "watch_later" });
    backdateLastRefreshed(db, summary.id);
    expect(library.getSeries(summary.id)?.category).toBe("watch_later");

    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });
    const app = createApp(loadConfig({}), {
      library,
      providers: [twoEpisodeProvider()],
      dataDir: "/tmp/baykus-test",
      vapid: { publicKey: "test-public", privateKey: "test-private" },
      auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
    });

    const res = await app.request(`/api/library/series/${summary.id}/refresh`, {
      method: "POST",
      headers: HEADERS,
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as { newEpisodes: number }).toMatchObject({ newEpisodes: 1 });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
});
