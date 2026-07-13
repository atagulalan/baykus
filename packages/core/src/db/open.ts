import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.ts";

export interface LibraryDb {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
}

const migrationsFolder = fileURLToPath(new URL("../../migrations", import.meta.url));

/**
 * Opens (creating if needed) a library SQLite file and applies any pending
 * migrations. Safe to call repeatedly on the same file — migrations already
 * applied are skipped. `filePath: ":memory:"` is supported for tests.
 */
export function openLibraryDb(filePath: string): LibraryDb {
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });

  return { db, sqlite };
}
