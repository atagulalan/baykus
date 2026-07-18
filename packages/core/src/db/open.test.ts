import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { openLibraryDb } from "./open.ts";

const REAL_MIGRATIONS_FOLDER = fileURLToPath(new URL("../../migrations", import.meta.url));

/** A migrations folder containing only 0000_init.sql, as if 0001 hadn't landed yet. */
function makeV1MigrationsFolder(): string {
  const dir = mkdtempSync(join(tmpdir(), "baykus-core-v1-migrations-"));
  cpSync(REAL_MIGRATIONS_FOLDER, dir, { recursive: true });
  rmSync(join(dir, "0001_tracking_manual_list.sql"));
  rmSync(join(dir, "meta", "0001_snapshot.json"));
  const journalPath = join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx === 0);
  writeFileSync(journalPath, JSON.stringify(journal, null, 2));
  return dir;
}

/** A migrations folder containing 0000 + 0001, as if 0002 hadn't landed yet. */
function makeV2MigrationsFolder(): string {
  const dir = mkdtempSync(join(tmpdir(), "baykus-core-v2-migrations-"));
  cpSync(REAL_MIGRATIONS_FOLDER, dir, { recursive: true });
  rmSync(join(dir, "0002_items_added_via.sql"));
  rmSync(join(dir, "meta", "0002_snapshot.json"));
  const journalPath = join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= 1);
  writeFileSync(journalPath, JSON.stringify(journal, null, 2));
  return dir;
}

/** A migrations folder containing 0000-0002, as if 0003 (favorite, E61) hadn't landed yet. */
function makeV3MigrationsFolder(): string {
  const dir = mkdtempSync(join(tmpdir(), "baykus-core-v3-migrations-"));
  cpSync(REAL_MIGRATIONS_FOLDER, dir, { recursive: true });
  rmSync(join(dir, "0003_tracking_favorite.sql"));
  rmSync(join(dir, "meta", "0003_snapshot.json"));
  const journalPath = join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= 2);
  writeFileSync(journalPath, JSON.stringify(journal, null, 2));
  return dir;
}

const ALL_TABLES = [
  "episodes",
  "items",
  "profile_media",
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

  it("creates all 10 library tables", () => {
    const { sqlite } = openLibraryDb(":memory:");
    const rows = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
      )
      .all() as { name: string }[];
    expect(rows.map((r) => r.name).sort()).toEqual(ALL_TABLES);
    sqlite.close();
  });

  it("accepts an explicit migrationsFolder override (M9.1: needed once apps/server bundles this code, breaking the default import.meta.url-relative path)", () => {
    const explicitFolder = fileURLToPath(new URL("../../migrations", import.meta.url));
    const { sqlite } = openLibraryDb(":memory:", explicitFolder);
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

  describe("migration 0001: tracking.status -> manual_list (E26)", () => {
    let dir: string;
    let v1Folder: string;

    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
      if (v1Folder) rmSync(v1Folder, { recursive: true, force: true });
    });

    it("maps every legacy v1 status on upgrade, preserving push_muted/note/list_changed_at", () => {
      dir = mkdtempSync(join(tmpdir(), "baykus-core-test-"));
      v1Folder = makeV1MigrationsFolder();
      const file = join(dir, "library.db");

      const v1 = openLibraryDb(file, v1Folder);
      v1.sqlite.exec(`
        INSERT INTO items (id, media_type, title, added_at) VALUES
          (1, 'series', 'A', '2026-01-01T00:00:00Z'),
          (2, 'series', 'B', '2026-01-01T00:00:00Z'),
          (3, 'series', 'C', '2026-01-01T00:00:00Z'),
          (4, 'series', 'D', '2026-01-01T00:00:00Z'),
          (5, 'series', 'E', '2026-01-01T00:00:00Z');
      `);
      const insertTracking = v1.sqlite.prepare(
        "INSERT INTO tracking (item_id, status, push_muted, note, status_changed_at) VALUES (?, ?, ?, ?, ?)",
      );
      insertTracking.run(1, "plan_to_watch", 0, null, "2026-02-01T00:00:00Z");
      insertTracking.run(2, "dropped", 1, "not for me", "2026-02-02T00:00:00Z");
      insertTracking.run(3, "watching", 0, null, "2026-02-03T00:00:00Z");
      insertTracking.run(4, "completed", 0, null, "2026-02-04T00:00:00Z");
      insertTracking.run(5, "paused", 0, "on hold", "2026-02-05T00:00:00Z");
      v1.sqlite.close();

      const upgraded = openLibraryDb(file, REAL_MIGRATIONS_FOLDER);
      const rows = upgraded.sqlite
        .prepare(
          "SELECT item_id, manual_list, push_muted, note, list_changed_at FROM tracking ORDER BY item_id",
        )
        .all();
      expect(rows).toEqual([
        {
          item_id: 1,
          manual_list: "watch_later",
          push_muted: 0,
          note: null,
          list_changed_at: "2026-02-01T00:00:00Z",
        },
        {
          item_id: 2,
          manual_list: "stopped",
          push_muted: 1,
          note: "not for me",
          list_changed_at: "2026-02-02T00:00:00Z",
        },
        {
          item_id: 3,
          manual_list: null,
          push_muted: 0,
          note: null,
          list_changed_at: "2026-02-03T00:00:00Z",
        },
        {
          item_id: 4,
          manual_list: null,
          push_muted: 0,
          note: null,
          list_changed_at: "2026-02-04T00:00:00Z",
        },
        {
          item_id: 5,
          manual_list: null,
          push_muted: 0,
          note: "on hold",
          list_changed_at: "2026-02-05T00:00:00Z",
        },
      ]);
      upgraded.sqlite.close();
    });
  });

  describe("migration 0002: items.added_via backfill (E32)", () => {
    let dir: string;
    let v2Folder: string;

    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
      if (v2Folder) rmSync(v2Folder, { recursive: true, force: true });
    });

    it("backfills added_via from watch sources, tvtime winning over zip", () => {
      dir = mkdtempSync(join(tmpdir(), "baykus-core-test-"));
      v2Folder = makeV2MigrationsFolder();
      const file = join(dir, "library.db");

      const v2 = openLibraryDb(file, v2Folder);
      v2.sqlite.exec(`
        INSERT INTO items (id, media_type, title, added_at) VALUES
          (1, 'series', 'A', '2026-01-01T00:00:00Z'),
          (2, 'series', 'B', '2026-01-01T00:00:00Z'),
          (3, 'series', 'C', '2026-01-01T00:00:00Z'),
          (4, 'series', 'D', '2026-01-01T00:00:00Z'),
          (5, 'series', 'E', '2026-01-01T00:00:00Z');
        INSERT INTO episodes (id, item_id, season_number, episode_number) VALUES
          (1, 1, 1, 1),
          (2, 2, 1, 1),
          (3, 3, 1, 1),
          (4, 3, 1, 2),
          (5, 4, 1, 1);
      `);
      const insertWatch = v2.sqlite.prepare(
        "INSERT INTO watches (episode_id, item_id, watched_at, source) VALUES (?, ?, ?, ?)",
      );
      insertWatch.run(1, 1, "2026-02-01T00:00:00Z", "import:zip");
      insertWatch.run(2, 2, "2026-02-02T00:00:00Z", "import:tvtime");
      insertWatch.run(3, 3, "2026-02-03T00:00:00Z", "import:zip");
      insertWatch.run(4, 3, "2026-02-04T00:00:00Z", "import:tvtime");
      insertWatch.run(5, 4, "2026-02-05T00:00:00Z", "manual");
      // item E (id 5) has zero watches.
      v2.sqlite.close();

      const upgraded = openLibraryDb(file, REAL_MIGRATIONS_FOLDER);
      const rows = upgraded.sqlite.prepare("SELECT id, added_via FROM items ORDER BY id").all();
      expect(rows).toEqual([
        { id: 1, added_via: "import:zip" },
        { id: 2, added_via: "import:tvtime" },
        { id: 3, added_via: "import:tvtime" },
        { id: 4, added_via: "manual" },
        { id: 5, added_via: "manual" },
      ]);
      upgraded.sqlite.close();
    });
  });

  describe("migration 0003: tracking.favorite (E61)", () => {
    let dir: string;
    let v3Folder: string;

    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
      if (v3Folder) rmSync(v3Folder, { recursive: true, force: true });
    });

    it("adds the favorite column, false for every pre-existing row", () => {
      dir = mkdtempSync(join(tmpdir(), "baykus-core-test-"));
      v3Folder = makeV3MigrationsFolder();
      const file = join(dir, "library.db");

      const v3 = openLibraryDb(file, v3Folder);
      v3.sqlite.exec(`
        INSERT INTO items (id, media_type, title, added_at) VALUES
          (1, 'series', 'A', '2026-01-01T00:00:00Z'),
          (2, 'series', 'B', '2026-01-01T00:00:00Z');
      `);
      const insertTracking = v3.sqlite.prepare(
        "INSERT INTO tracking (item_id, manual_list, push_muted, note, list_changed_at) VALUES (?, ?, ?, ?, ?)",
      );
      insertTracking.run(1, null, 0, null, "2026-02-01T00:00:00Z");
      insertTracking.run(2, "watch_later", 0, null, "2026-02-02T00:00:00Z");
      v3.sqlite.close();

      const upgraded = openLibraryDb(file, REAL_MIGRATIONS_FOLDER);
      const rows = upgraded.sqlite
        .prepare("SELECT item_id, favorite FROM tracking ORDER BY item_id")
        .all();
      expect(rows).toEqual([
        { item_id: 1, favorite: 0 },
        { item_id: 2, favorite: 0 },
      ]);
      upgraded.sqlite.close();
    });
  });
});
