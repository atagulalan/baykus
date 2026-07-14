import { createLibrary, openLibraryDb } from "@baykus/core";
import type { SeriesDetails } from "@baykus/provider-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import { notifyNewEpisodes } from "./notify.ts";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

const VAPID = { publicKey: "pub", privateKey: "priv" };

function fixtureSeries(): SeriesDetails {
  return {
    providerId: "fake",
    mediaType: "series",
    externalIds: { tvmazeId: 1 },
    title: "Test Show",
    seasons: [],
  };
}

beforeEach(() => {
  vi.mocked(webpush.sendNotification).mockClear();
  vi.mocked(webpush.sendNotification).mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("notifyNewEpisodes", () => {
  it("sends a notification to every subscription", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries(), "watching");
    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });
    library.addPushSubscription({ endpoint: "https://push.test/b", p256dh: "p2", auth: "a2" });

    await notifyNewEpisodes(library, VAPID, {
      itemId: summary.id,
      title: "Test Show",
      newEpisodes: 2,
    });

    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });

  it("a muted series is skipped entirely — no send attempted", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries(), "watching");
    library.updateTracking(summary.id, { pushMuted: true });
    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });

    await notifyNewEpisodes(library, VAPID, {
      itemId: summary.id,
      title: "Test Show",
      newEpisodes: 1,
    });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing when newEpisodes is 0", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries(), "watching");
    library.addPushSubscription({ endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });

    await notifyNewEpisodes(library, VAPID, {
      itemId: summary.id,
      title: "Test Show",
      newEpisodes: 0,
    });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("removes a subscription the push service reports as gone (410)", async () => {
    const library = createLibrary(openLibraryDb(":memory:").db);
    const summary = library.addSeries(fixtureSeries(), "watching");
    library.addPushSubscription({ endpoint: "https://push.test/gone", p256dh: "p1", auth: "a1" });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
      Object.assign(new Error("gone"), { statusCode: 410 }),
    );

    await notifyNewEpisodes(library, VAPID, {
      itemId: summary.id,
      title: "Test Show",
      newEpisodes: 1,
    });

    expect(library.listPushSubscriptions()).toEqual([]);
  });
});
