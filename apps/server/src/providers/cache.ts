import type { ExternalIds, MetadataProvider, SearchOptions } from "@baykus/provider-sdk";
import Database from "better-sqlite3";

export function openMetadataCache(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      provider_id TEXT NOT NULL,
      method_name TEXT NOT NULL,
      cache_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (provider_id, method_name, cache_key)
    )
  `);

  return db;
}

function hashExternalIds(ids: ExternalIds): string {
  return Object.entries(ids as Record<string, unknown>)
    .filter(([_, v]) => v !== undefined)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
}

function hashSearchOpts(query: string, opts?: SearchOptions): string {
  if (!opts) return query;
  return JSON.stringify({ query, ...opts });
}

export function withMetadataCache(
  provider: MetadataProvider,
  db: Database.Database,
  maxAgeDays = 1,
): MetadataProvider {
  const getStmt = db.prepare(`
    SELECT payload, fetched_at FROM cache_entries
    WHERE provider_id = ? AND method_name = ? AND cache_key = ?
  `);

  const setStmt = db.prepare(`
    INSERT INTO cache_entries (provider_id, method_name, cache_key, payload, fetched_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(provider_id, method_name, cache_key) DO UPDATE SET
      payload = excluded.payload,
      fetched_at = excluded.fetched_at
  `);

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  async function cached<T>(
    methodName: string,
    cacheKey: string,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    const row = getStmt.get(provider.id, methodName, cacheKey) as
      | { payload: string; fetched_at: string }
      | undefined;

    if (row) {
      const ageMs = Date.now() - new Date(row.fetched_at).getTime();
      if (ageMs <= maxAgeMs) {
        try {
          return JSON.parse(row.payload) as T;
        } catch {
          // Fall through on JSON parse error
        }
      }
    }

    const payloadObj = await fetchFn();
    setStmt.run(
      provider.id,
      methodName,
      cacheKey,
      JSON.stringify(payloadObj),
      new Date().toISOString(),
    );
    return payloadObj;
  }

  return {
    ...provider,
    getSeriesDetails: (ids) =>
      cached("getSeriesDetails", hashExternalIds(ids), () => provider.getSeriesDetails(ids)),
    search: (query, opts) =>
      cached("search", hashSearchOpts(query, opts), () => provider.search(query, opts)),
  };
}
