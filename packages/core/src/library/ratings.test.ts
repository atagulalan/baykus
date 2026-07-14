import { describe, expect, it } from "vitest";
import { openLibraryDb } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { clearRating, getRating, setRating } from "./ratings.ts";

function insertItem(db: ReturnType<typeof openLibraryDb>["db"]): number {
  return db
    .insert(schema.items)
    .values({ mediaType: "series", title: "Test Show", addedAt: "2026-01-01T00:00:00Z" })
    .returning({ id: schema.items.id })
    .get().id;
}

describe("setRating", () => {
  it("upsert overwrites the previous value", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);

    const first = setRating(db, "item", itemId, 2);
    expect(first.value).toBe(2);

    const second = setRating(db, "item", itemId, 3);
    expect(second.value).toBe(3);

    expect(getRating(db, "item", itemId)?.value).toBe(3);
    expect(db.select().from(schema.ratings).all()).toHaveLength(1);
  });

  it("invalid value throws (DB CHECK)", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    expect(() => setRating(db, "item", itemId, 4 as unknown as 1 | 2 | 3)).toThrow();
  });
});

describe("clearRating", () => {
  it("removes an existing rating and returns true", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    setRating(db, "item", itemId, 1);

    expect(clearRating(db, "item", itemId)).toBe(true);
    expect(getRating(db, "item", itemId)).toBeNull();
  });

  it("returns false when nothing to clear", () => {
    const { db } = openLibraryDb(":memory:");
    expect(clearRating(db, "item", 999)).toBe(false);
  });
});

describe("getRating", () => {
  it("keeps item and episode ratings independent for the same target id", () => {
    const { db } = openLibraryDb(":memory:");
    const itemId = insertItem(db);
    setRating(db, "item", itemId, 3);
    setRating(db, "episode", itemId, 1);

    expect(getRating(db, "item", itemId)?.value).toBe(3);
    expect(getRating(db, "episode", itemId)?.value).toBe(1);
  });
});
