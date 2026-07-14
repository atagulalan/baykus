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
    seasons: [{ number: 1, episodes: [{ seasonNumber: 1, episodeNumber: 1, title: "Pilot" }] }],
  };
}

function setup() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const app = createApp(loadConfig({}), {
    library,
    providers: [],
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public", privateKey: "test-private" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return { app, library };
}

async function zipFormData(buffer: ArrayBuffer, mode?: string): Promise<FormData> {
  const formData = new FormData();
  formData.append("file", new File([buffer], "export.zip", { type: "application/zip" }));
  if (mode !== undefined) formData.append("mode", mode);
  return formData;
}

describe("GET /api/export.zip", () => {
  it("streams a zip with the expected headers", async () => {
    const { app, library } = setup();
    library.addSeries(fixtureSeries(), "watching");

    const res = await app.request("/api/export.zip");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="baykus-export-\d{8}\.zip"$/,
    );
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});

describe("POST /api/import", () => {
  it("imports a previously exported zip on an empty library without a mode", async () => {
    const { app: sourceApp, library: sourceLibrary } = setup();
    sourceLibrary.addSeries(fixtureSeries(), "watching");
    const exportRes = await sourceApp.request("/api/export.zip");
    const zipBuffer = await exportRes.arrayBuffer();

    const { app } = setup();
    const res = await app.request("/api/import", {
      method: "POST",
      headers: { "X-Baykus": "1" },
      body: await zipFormData(zipBuffer),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: number; mode: string; warnings: string[] };
    expect(body.items).toBe(1);
    expect(body.mode).toBe("replace");
    expect(body.warnings).toEqual([]);
  });

  it("409 when mode is missing and the library is not empty", async () => {
    const { app: sourceApp, library: sourceLibrary } = setup();
    sourceLibrary.addSeries(fixtureSeries(), "watching");
    const zipBuffer = await (await sourceApp.request("/api/export.zip")).arrayBuffer();

    const { app, library } = setup();
    library.addSeries(fixtureSeries(), "watching"); // library is non-empty

    const res = await app.request("/api/import", {
      method: "POST",
      headers: { "X-Baykus": "1" },
      body: await zipFormData(zipBuffer),
    });
    expect(res.status).toBe(409);
  });

  it("merge mode works on a non-empty library when explicitly requested", async () => {
    const { app: sourceApp, library: sourceLibrary } = setup();
    sourceLibrary.addSeries(fixtureSeries(), "watching");
    const zipBuffer = await (await sourceApp.request("/api/export.zip")).arrayBuffer();

    const { app } = setup();
    const res = await app.request("/api/import", {
      method: "POST",
      headers: { "X-Baykus": "1" },
      body: await zipFormData(zipBuffer, "merge"),
    });
    expect(res.status).toBe(200);
  });

  it("400 VALIDATION_FAILED when the file field is missing", async () => {
    const { app } = setup();
    const formData = new FormData();
    formData.append("mode", "replace");
    const res = await app.request("/api/import", {
      method: "POST",
      headers: { "X-Baykus": "1" },
      body: formData,
    });
    expect(res.status).toBe(400);
  });

  it("422 UNSUPPORTED_SCHEMA for a bad zip", async () => {
    const { app } = setup();
    const res = await app.request("/api/import", {
      method: "POST",
      headers: { "X-Baykus": "1" },
      body: await zipFormData(new TextEncoder().encode("not a zip").buffer, "replace"),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNSUPPORTED_SCHEMA");
  });
});
