import { eq } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";

export type Locale = "tr" | "en";
export type Theme = "dark" | "light" | "system";
export type EpisodeLabelFormat = "SxEy" | "S01E06" | "compact";
export type DefaultStartPage = "home" | "calendar" | "stats";
export type NewSeriesDefaultStatus = "watching" | "watchlist";

export interface Settings {
  locale: Locale;
  region: string;
  theme: Theme;
  scrapersEnabled: boolean;
  /** Never the raw key — write-only over the API. */
  tmdbApiKeySet: boolean;
  /** Days; governs watch recency, new-episode lift, newly-added lift (E31). */
  watchingWindowDays: number;
  /** Episode label display format (E116). */
  episodeLabelFormat: EpisodeLabelFormat;
  spoilerProtection: boolean;
  defaultStartPage: DefaultStartPage;
  newSeriesDefaultStatus: NewSeriesDefaultStatus;
}

export interface SettingsPatch {
  locale?: Locale;
  region?: string;
  theme?: Theme;
  scrapersEnabled?: boolean;
  /** null (or "") clears the stored key. */
  tmdbApiKey?: string | null;
  watchingWindowDays?: number;
  episodeLabelFormat?: EpisodeLabelFormat;
  spoilerProtection?: boolean;
  defaultStartPage?: DefaultStartPage;
  newSeriesDefaultStatus?: NewSeriesDefaultStatus;
}

const DEFAULTS = {
  locale: "tr",
  region: "TR",
  theme: "dark",
  scrapers_enabled: "0",
  watching_window_days: "30",
  episode_label_format: "SxEy",
  spoiler_protection: "0",
  default_start_page: "home",
  new_series_default_status: "watching",
} as const;

const DEFAULT_WATCHING_WINDOW_DAYS = 30;
const DEFAULT_EPISODE_LABEL_FORMAT: EpisodeLabelFormat = "SxEy";
const VALID_EPISODE_LABEL_FORMATS: ReadonlySet<string> = new Set(["SxEy", "S01E06", "compact"]);
const VALID_START_PAGES: ReadonlySet<string> = new Set(["home", "calendar", "stats"]);
const VALID_DEFAULT_STATUSES: ReadonlySet<string> = new Set(["watching", "watchlist"]);

/** Route zod is the write-side guard; a weird stored value never throws here (E31). */
function parseWatchingWindowDays(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_WATCHING_WINDOW_DAYS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 365) return DEFAULT_WATCHING_WINDOW_DAYS;
  return n;
}

/** Route zod is the write-side guard; a weird stored value never throws here (E116). */
function parseEpisodeLabelFormat(raw: string | undefined): EpisodeLabelFormat {
  if (raw !== undefined && VALID_EPISODE_LABEL_FORMATS.has(raw)) return raw as EpisodeLabelFormat;
  return DEFAULT_EPISODE_LABEL_FORMAT;
}

function parseStartPage(raw: string | undefined): DefaultStartPage {
  if (raw !== undefined && VALID_START_PAGES.has(raw)) return raw as DefaultStartPage;
  return "home";
}

function parseNewSeriesStatus(raw: string | undefined): NewSeriesDefaultStatus {
  if (raw !== undefined && VALID_DEFAULT_STATUSES.has(raw)) return raw as NewSeriesDefaultStatus;
  return "watching";
}

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
    watchingWindowDays: parseWatchingWindowDays(kv.get("watching_window_days")),
    episodeLabelFormat: parseEpisodeLabelFormat(kv.get("episode_label_format")),
    spoilerProtection: (kv.get("spoiler_protection") ?? DEFAULTS.spoiler_protection) === "1",
    defaultStartPage: parseStartPage(kv.get("default_start_page")),
    newSeriesDefaultStatus: parseNewSeriesStatus(kv.get("new_series_default_status")),
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
  if (patch.watchingWindowDays !== undefined) {
    upsert(db, "watching_window_days", String(patch.watchingWindowDays));
  }
  if (patch.episodeLabelFormat !== undefined) {
    upsert(db, "episode_label_format", patch.episodeLabelFormat);
  }
  if (patch.spoilerProtection !== undefined) {
    upsert(db, "spoiler_protection", patch.spoilerProtection ? "1" : "0");
  }
  if (patch.defaultStartPage !== undefined) {
    upsert(db, "default_start_page", patch.defaultStartPage);
  }
  if (patch.newSeriesDefaultStatus !== undefined) {
    upsert(db, "new_series_default_status", patch.newSeriesDefaultStatus);
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
