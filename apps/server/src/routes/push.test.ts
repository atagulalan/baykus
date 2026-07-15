import { createLibrary, openLibraryDb } from "@baykus/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import { createApp } from "../app.ts";
import { createSingleSessionStore } from "../auth/single-session.ts";
import { loadConfig } from "../config.ts";

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

afterEach(() => {
  vi.clearAllMocks();
});

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

describe("POST /api/push/test (E39)", () => {
  it("200 and sends one notification to the requesting endpoint", async () => {
    const { app, library } = setup();
    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });

    const res = await app.request("/api/push/test", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ endpoint: "https://push.test/a" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.test/a", keys: { p256dh: "p1", auth: "a1" } },
      expect.any(String),
    );
  });

  it("404 for an unknown endpoint, zero sends", async () => {
    const { app } = setup();

    const res = await app.request("/api/push/test", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ endpoint: "https://push.test/unknown" }),
    });

    expect(res.status).toBe(404);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("410 from the push service removes the subscription and returns 404", async () => {
    const { app, library } = setup();
    library.addPushSubscription({ endpoint: "https://push.test/gone", p256dh: "p1", auth: "a1" });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
      Object.assign(new Error("gone"), { statusCode: 410 }),
    );

    const res = await app.request("/api/push/test", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ endpoint: "https://push.test/gone" }),
    });

    expect(res.status).toBe(404);
    expect(library.listPushSubscriptions()).toEqual([]);
  });

  it("400 VALIDATION_FAILED for extra body fields (strict)", async () => {
    const { app, library } = setup();
    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });

    const res = await app.request("/api/push/test", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ endpoint: "https://push.test/a", extra: "nope" }),
    });

    expect(res.status).toBe(400);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
});
