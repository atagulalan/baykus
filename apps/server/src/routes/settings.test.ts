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
});
