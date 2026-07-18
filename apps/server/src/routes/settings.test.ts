import { createLibrary, openLibraryDb } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";

function fakeProvider(id: string): MetadataProvider {
  return {
    id,
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
    async getSeriesDetails() {
      throw new Error("not used in this test");
    },
    resolveImageUrl() {
      return "";
    },
  };
}

function setup(providers: MetadataProvider[] = [fakeProvider("tvmaze")]) {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const app = createApp(loadConfig({}), {
    library,
    providers,
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return { app, providers };
}

const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };

describe("GET /api/settings", () => {
  it("returns defaults on a fresh library", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      locale: "tr",
      region: "TR",
      theme: "dark",
      scrapersEnabled: false,
      tmdbApiKeySet: false,
      watchingWindowDays: 30,
      episodeLabelFormat: "SxEy",
      spoilerProtection: false,
      defaultStartPage: "home",
      newSeriesDefaultStatus: "watching",
      uiPrefs: null,
    });
  });
});

describe("PATCH /api/settings", () => {
  it("updates locale/region and returns the merged settings", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ locale: "en", region: "US" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ locale: "en", region: "US" });
  });

  it("never echoes the raw tmdbApiKey back", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ tmdbApiKey: "super-secret" }),
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tmdbApiKeySet).toBe(true);
    expect(body).not.toHaveProperty("tmdbApiKey");
    expect(JSON.stringify(body)).not.toContain("super-secret");
  });

  it("saving a tmdbApiKey puts tmdb first in the live provider list", async () => {
    const { app, providers } = setup();
    expect(providers.map((p) => p.id)).toEqual(["tvmaze"]);

    await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ tmdbApiKey: "a-real-looking-key" }),
    });

    expect(providers.map((p) => p.id)).toEqual(["tmdb", "tvmaze"]);
  });

  it("clearing the tmdbApiKey falls back to tvmaze-only", async () => {
    const { app, providers } = setup();
    await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ tmdbApiKey: "a-real-looking-key" }),
    });
    expect(providers.map((p) => p.id)).toEqual(["tmdb", "tvmaze"]);

    await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ tmdbApiKey: null }),
    });
    expect(providers.map((p) => p.id)).toEqual(["tvmaze"]);
  });

  it("400 VALIDATION_FAILED for an invalid region", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ region: "USA" }),
    });
    expect(res.status).toBe(400);
  });

  it("updates watchingWindowDays and round-trips it (E31)", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ watchingWindowDays: 14 }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ watchingWindowDays: 14 });

    const getRes = await app.request("/api/settings");
    expect(await getRes.json()).toMatchObject({ watchingWindowDays: 14 });
  });

  it.each([
    0, 366, 1.5,
  ])("400 VALIDATION_FAILED for watchingWindowDays out of range (%s)", async (value) => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ watchingWindowDays: value }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("updates episodeLabelFormat and round-trips it (E116)", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ episodeLabelFormat: "S01E06" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ episodeLabelFormat: "S01E06" });

    const getRes = await app.request("/api/settings");
    expect(await getRes.json()).toMatchObject({ episodeLabelFormat: "S01E06" });
  });

  it("400 VALIDATION_FAILED for an invalid episodeLabelFormat", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ episodeLabelFormat: "invalid" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("updates uiPrefs and round-trips it (E143)", async () => {
    const { app } = setup();
    const uiPrefs = {
      libraryBrowse: { sort: "title", category: ["watching"] },
      watchSections: ["watching", "finished"],
      watchSectionSorts: { finished: "added" },
      historyCollapsed: true,
      skipSectionRemoveConfirm: false,
      showNextUpCarousel: true,
      browseView: "grid",
    };
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ uiPrefs }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ uiPrefs });

    const getRes = await app.request("/api/settings");
    expect(await getRes.json()).toMatchObject({ uiPrefs });
  });

  it("null clears uiPrefs", async () => {
    const { app } = setup();
    await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({
        uiPrefs: {
          libraryBrowse: { sort: "lastWatched", category: [] },
          watchSections: ["watching"],
          watchSectionSorts: {},
          historyCollapsed: false,
          skipSectionRemoveConfirm: false,
          showNextUpCarousel: true,
        },
      }),
    });
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ uiPrefs: null }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ uiPrefs: null });
  });

  it("400 VALIDATION_FAILED for invalid uiPrefs", async () => {
    const { app } = setup();
    const res = await app.request("/api/settings", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({
        uiPrefs: {
          libraryBrowse: { sort: "nope", category: [] },
          watchSections: ["watching"],
          watchSectionSorts: {},
          historyCollapsed: false,
          skipSectionRemoveConfirm: false,
          showNextUpCarousel: true,
        },
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });
});
