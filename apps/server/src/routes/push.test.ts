import { createLibrary, openLibraryDb } from "@baykus/core";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";

function setup() {
  const library = createLibrary(openLibraryDb(":memory:").db);
  const app = createApp(loadConfig({}), {
    library,
    providers: [],
    dataDir: "/tmp/baykus-test",
    vapid: { publicKey: "test-public-key", privateKey: "test-private-key" },
    auth: { mode: "single", password: undefined, singleSessions: createSingleSessionStore() },
  });
  return { app, library };
}

const HEADERS = { "content-type": "application/json", "X-Baykus": "1" };

describe("GET /api/push/vapid-public-key", () => {
  it("returns the configured public key", async () => {
    const { app } = setup();
    const res = await app.request("/api/push/vapid-public-key");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ key: "test-public-key" });
  });
});

describe("POST /api/push/subscribe", () => {
  it("stores the subscription and returns 201", async () => {
    const { app, library } = setup();
    const res = await app.request("/api/push/subscribe", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        endpoint: "https://push.test/a",
        keys: { p256dh: "p1", auth: "a1" },
      }),
    });
    expect(res.status).toBe(201);
    expect(library.listPushSubscriptions()).toEqual([
      { endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" },
    ]);
  });

  it("400 VALIDATION_FAILED when keys are missing", async () => {
    const { app } = setup();
    const res = await app.request("/api/push/subscribe", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ endpoint: "https://push.test/a" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/push/subscribe", () => {
  it("removes the subscription and returns 204", async () => {
    const { app, library } = setup();
    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });

    const res = await app.request("/api/push/subscribe", {
      method: "DELETE",
      headers: HEADERS,
      body: JSON.stringify({ endpoint: "https://push.test/a" }),
    });
    expect(res.status).toBe(204);
    expect(library.listPushSubscriptions()).toEqual([]);
  });
});
