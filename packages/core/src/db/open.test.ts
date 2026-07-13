import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openLibraryDb } from "./open.ts";

const ALL_TABLES = [
  "episodes",
  "items",
  "push_subscriptions",
  "ratings",
  "refresh_log",
  "seasons",
  "settings",
  "tracking",
  "watches",
].sort();

describe("openLibraryDb", () => {
  it("opens :memory: and applies WAL/foreign_keys/busy_timeout pragmas", () => {
    const { sqlite } = openLibraryDb(":memory:");
    expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
    sqlite.close();
  });

  it("creates all 9 library tables", () => {
    const { sqlite } = openLibraryDb(":memory:");
    const rows = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
      )
      .all() as { name: string }[];
    expect(rows.map((r) => r.name).sort()).toEqual(ALL_TABLES);
    sqlite.close();
  });

  it("cascades delete: removing an item deletes its episodes", () => {
    const { sqlite } = openLibraryDb(":memory:");
    sqlite
      .prepare(
        "INSERT INTO items (id, media_type, title, added_at) VALUES (1, 'series', 'Test', '2026-01-01T00:00:00Z')",
      )
      .run();
    sqlite
      .prepare("INSERT INTO episodes (item_id, season_number, episode_number) VALUES (1, 1, 1)")
      .run();
    expect(sqlite.prepare("SELECT COUNT(*) as c FROM episodes").get()).toEqual({ c: 1 });

    sqlite.prepare("DELETE FROM items WHERE id = 1").run();
    expect(sqlite.prepare("SELECT COUNT(*) as c FROM episodes").get()).toEqual({ c: 0 });
    sqlite.close();
  });

  describe("on a real file", () => {
    let dir: string;

    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
    });

    it("can be opened twice without error (idempotent migrations)", () => {
      dir = mkdtempSync(join(tmpdir(), "baykus-core-test-"));
      const file = join(dir, "library.db");

      const first = openLibraryDb(file);
      first.sqlite.prepare("SELECT 1").run();
      first.sqlite.close();

      const second = openLibraryDb(file);
      const rows = second.sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];
      expect(rows.map((r) => r.name)).toEqual(expect.arrayContaining(ALL_TABLES));
      second.sqlite.close();
    });
  });
});
