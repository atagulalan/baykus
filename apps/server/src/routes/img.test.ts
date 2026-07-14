import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLibrary, openLibraryDb } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "baykus-img-route-"));
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(dataDir, { recursive: true, force: true });
});

function fakeProvider(): MetadataProvider {
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
    async getSeriesDetails() {
      throw new Error("not used in this test");
    },
    resolveImageUrl(ref, size) {
      return `https://cdn.example.test/${size}${ref.slice(ref.indexOf(":") + 1)}`;
    },
  };
}

function setup() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const app = createApp(loadConfig({}), {
    library,
    providers: [fakeProvider()],
    dataDir,
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return app;
}

describe("GET /img/:providerId/:size/:path", () => {
  it("happy path fetches through the cache and serves immutable headers", async () => {
    const app = setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("bytes", { status: 200, headers: { "content-type": "image/jpeg" } }),
    );

    const res = await app.request(`/img/fake/medium/${encodeURIComponent("/a.jpg")}`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(await res.text()).toBe("bytes");
    expect(fetch).toHaveBeenCalledWith("https://cdn.example.test/medium/a.jpg");
  });

  it("404s for an unknown provider", async () => {
    const app = setup();
    const res = await app.request(`/img/unknown/medium/${encodeURIComponent("/a.jpg")}`);
    expect(res.status).toBe(404);
  });

  it("404s for an unknown size", async () => {
    const app = setup();
    const res = await app.request(`/img/fake/huge/${encodeURIComponent("/a.jpg")}`);
    expect(res.status).toBe(404);
  });

  it("is auth-exempt — no X-Baykus header required", async () => {
    const app = setup();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("bytes", { status: 200 }));
    const res = await app.request(`/img/fake/medium/${encodeURIComponent("/a.jpg")}`);
    expect(res.status).toBe(200);
  });
});
