import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createLibrary, type Library, openLibraryDb } from "@baykus/core";
import type Database from "better-sqlite3";
import { libraryDbPath } from "./library-path.ts";

const MAX_OPEN = 20;
const IDLE_MS = 10 * 60 * 1000;

interface PoolEntry {
  library: Library;
  sqlite: Database.Database;
  lastUsed: number;
}

export interface LibraryPool {
  /** Opens (or reuses) the handle's library.db, marking it most-recently-used. */
  get(handle: string): Library;
  /** Closes and evicts a handle's connection, e.g. after account deletion. */
  close(handle: string): void;
  closeAll(): void;
}

/**
 * Article I: multi-tenancy lives entirely here, in apps/server — packages/core
 * only ever sees one library.db path per createLibrary() call and has no idea
 * a pool exists. Map insertion order doubles as LRU order: re-inserting a key
 * moves it to the end, so the first key is always the least-recently-used one.
 */
export function createLibraryPool(dataDir: string, migrationsFolder?: string): LibraryPool {
  const entries = new Map<string, PoolEntry>();

  function evictIdle(): void {
    const now = Date.now();
    for (const [handle, entry] of entries) {
      if (now - entry.lastUsed > IDLE_MS) {
        entry.sqlite.close();
        entries.delete(handle);
      }
    }
  }

  function evictOldestIfFull(): void {
    if (entries.size < MAX_OPEN) return;
    const oldest = entries.keys().next();
    if (!oldest.done) {
      entries.get(oldest.value)?.sqlite.close();
      entries.delete(oldest.value);
    }
  }

  return {
    get(handle) {
      evictIdle();

      const existing = entries.get(handle);
      if (existing) {
        existing.lastUsed = Date.now();
        entries.delete(handle);
        entries.set(handle, existing);
        return existing.library;
      }

      evictOldestIfFull();
      const dbPath = libraryDbPath(dataDir, handle);
      mkdirSync(dirname(dbPath), { recursive: true });
      const { db, sqlite } = openLibraryDb(dbPath, migrationsFolder);
      const library = createLibrary(db);
      entries.set(handle, { library, sqlite, lastUsed: Date.now() });
      return library;
    },
    close(handle) {
      const entry = entries.get(handle);
      if (entry) {
        entry.sqlite.close();
        entries.delete(handle);
      }
    },
    closeAll() {
      for (const entry of entries.values()) entry.sqlite.close();
      entries.clear();
    },
  };
}
