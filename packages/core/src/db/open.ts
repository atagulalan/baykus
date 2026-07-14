import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.ts";

export type LibraryDatabase = BetterSQLite3Database<typeof schema>;

export interface LibraryDb {
  db: LibraryDatabase;
  sqlite: Database.Database;
}

const DEFAULT_MIGRATIONS_FOLDER = fileURLToPath(new URL("../../migrations", import.meta.url));

/**
 * Opens (creating if needed) a library SQLite file and applies any pending
 * migrations. Safe to call repeatedly on the same file — migrations already
 * applied are skipped. `filePath: ":memory:"` is supported for tests.
 *
 * `migrationsFolder` defaults to a path computed relative to *this source
 * file* — correct in dev/tests, but meaningless once this module is bundled
 * into another file (M9.1: apps/server's esbuild bundle inlines this code,
 * so `import.meta.url` at runtime points at dist/main.js, not here). The
 * bundled entrypoint passes an explicit override; nothing else needs to.
 */
export function openLibraryDb(
  filePath: string,
  migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER,
): LibraryDb {
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });

  return { db, sqlite };
}
