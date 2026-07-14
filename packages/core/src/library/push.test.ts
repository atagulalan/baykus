import { describe, expect, it } from "vitest";
import { openLibraryDb } from "../db/open.ts";
import { addPushSubscription, listPushSubscriptions, removePushSubscription } from "./push.ts";

describe("addPushSubscription", () => {
  it("adds a subscription and it's listed back", () => {
    const { db } = openLibraryDb(":memory:");
    addPushSubscription(db, { endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });

    expect(listPushSubscriptions(db)).toEqual([
      { endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" },
    ]);
  });

  it("re-subscribing the same endpoint updates the keys instead of duplicating", () => {
    const { db } = openLibraryDb(":memory:");
    addPushSubscription(db, { endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });
    addPushSubscription(db, { endpoint: "https://push.test/a", p256dh: "p2", auth: "a2" });

    const subs = listPushSubscriptions(db);
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ p256dh: "p2", auth: "a2" });
  });
});

describe("removePushSubscription", () => {
  it("removes an existing subscription and returns true", () => {
    const { db } = openLibraryDb(":memory:");
    addPushSubscription(db, { endpoint: "https://push.test/a", p256dh: "p1", auth: "a1" });

    expect(removePushSubscription(db, "https://push.test/a")).toBe(true);
    expect(listPushSubscriptions(db)).toEqual([]);
  });

  it("returns false when nothing to remove", () => {
    const { db } = openLibraryDb(":memory:");
    expect(removePushSubscription(db, "https://push.test/missing")).toBe(false);
  });
});
