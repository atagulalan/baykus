import { eq } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";

export type Locale = "tr" | "en";
export type Theme = "dark" | "light" | "system";

export interface Settings {
  locale: Locale;
  region: string;
  theme: Theme;
  scrapersEnabled: boolean;
  /** Never the raw key — write-only over the API. */
  tmdbApiKeySet: boolean;
}

export interface SettingsPatch {
  locale?: Locale;
  region?: string;
  theme?: Theme;
  scrapersEnabled?: boolean;
  /** null (or "") clears the stored key. */
  tmdbApiKey?: string | null;
}

const DEFAULTS = {
  locale: "tr",
  region: "TR",
  theme: "dark",
  scrapers_enabled: "0",
} as const;

function readAll(db: LibraryDatabase): Map<string, string> {
  const rows = db.select().from(schema.settings).all();
  return new Map(rows.map((r) => [r.key, r.value]));
}

function upsert(db: LibraryDatabase, key: string, value: string): void {
  db.insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
    .run();
}

function remove(db: LibraryDatabase, key: string): void {
  db.delete(schema.settings).where(eq(schema.settings.key, key)).run();
}

function toSettings(kv: Map<string, string>): Settings {
  return {
    locale: (kv.get("locale") ?? DEFAULTS.locale) as Locale,
    region: kv.get("region") ?? DEFAULTS.region,
    theme: (kv.get("theme") ?? DEFAULTS.theme) as Theme,
    scrapersEnabled: (kv.get("scrapers_enabled") ?? DEFAULTS.scrapers_enabled) === "1",
    tmdbApiKeySet: Boolean(kv.get("tmdb_api_key")),
  };
}

export function getSettings(db: LibraryDatabase): Settings {
  return toSettings(readAll(db));
}

export function updateSettings(db: LibraryDatabase, patch: SettingsPatch): Settings {
  if (patch.locale !== undefined) upsert(db, "locale", patch.locale);
  if (patch.region !== undefined) upsert(db, "region", patch.region);
  if (patch.theme !== undefined) upsert(db, "theme", patch.theme);
  if (patch.scrapersEnabled !== undefined) {
    upsert(db, "scrapers_enabled", patch.scrapersEnabled ? "1" : "0");
  }
  if (patch.tmdbApiKey !== undefined) {
    if (patch.tmdbApiKey) upsert(db, "tmdb_api_key", patch.tmdbApiKey);
    else remove(db, "tmdb_api_key");
  }
  return getSettings(db);
}

/** Internal use only (provider registry wiring) — never serialize this over the API. */
export function getTmdbApiKey(db: LibraryDatabase): string | undefined {
  const row = db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, "tmdb_api_key"))
    .get();
  return row?.value;
}
