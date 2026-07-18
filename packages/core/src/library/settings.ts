import { eq } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";

export type Locale = "tr" | "en";
export type Theme = "dark" | "light" | "system";
export type EpisodeLabelFormat = "SxEy" | "S01E06" | "compact";
export type DefaultStartPage = "home" | "calendar" | "stats";
export type NewSeriesDefaultStatus = "watching" | "watchlist";

/** Browse chrome prefs (E143) — mirrored in the web client; rides in zip via settings. */
export type LibrarySortKey = "lastWatched" | "added" | "title" | "rating" | "nextAir";

export type BrowseView = "list" | "grid";

export interface UiPrefs {
  libraryBrowse: {
    sort: LibrarySortKey;
    category: string[];
  };
  watchSections: string[];
  watchSectionSorts: Record<string, LibrarySortKey>;
  historyCollapsed: boolean;
  skipSectionRemoveConfirm: boolean;
  /** E144: series detail next-up carousel — default visible. */
  showNextUpCarousel: boolean;
  /** E142: last Watch browse surface — list=`/watch`, grid=`/`. */
  browseView: BrowseView;
}

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
  /** null when the row is absent or unparseable. */
  uiPrefs: UiPrefs | null;
  /** WP4: chosen profile banner — an `ImageRef` ("provider:path") of a watched series' backdrop, or null. */
  bannerRef: string | null;
  /** WP4: opaque cache-busting token (the upload timestamp) for the uploaded profile photo, or null if unset. */
  avatarRef: string | null;
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
  /** null clears the stored key. */
  uiPrefs?: UiPrefs | null;
  /** null clears the stored banner. avatarRef is not patchable here — it's server-derived by POST /api/settings/avatar. */
  bannerRef?: string | null;
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
const VALID_LIBRARY_SORTS: ReadonlySet<string> = new Set([
  "lastWatched",
  "added",
  "title",
  "rating",
  "nextAir",
]);

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

function isLibrarySortKey(value: unknown): value is LibrarySortKey {
  return typeof value === "string" && VALID_LIBRARY_SORTS.has(value);
}

/** Route zod is the write-side guard; garbage / partial JSON never throws (E143). */
export function parseUiPrefs(raw: string | undefined): UiPrefs | null {
  if (raw === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;
    const browseRaw = obj.libraryBrowse;
    const browse =
      browseRaw && typeof browseRaw === "object" && !Array.isArray(browseRaw)
        ? (browseRaw as Record<string, unknown>)
        : {};
    const sort = isLibrarySortKey(browse.sort) ? browse.sort : "lastWatched";
    const category = Array.isArray(browse.category)
      ? browse.category.filter((c): c is string => typeof c === "string")
      : [];
    const watchSections = Array.isArray(obj.watchSections)
      ? obj.watchSections.filter((c): c is string => typeof c === "string")
      : [];
    const sortsRaw = obj.watchSectionSorts;
    const watchSectionSorts: Record<string, LibrarySortKey> = {};
    if (sortsRaw && typeof sortsRaw === "object" && !Array.isArray(sortsRaw)) {
      for (const [key, value] of Object.entries(sortsRaw as Record<string, unknown>)) {
        if (isLibrarySortKey(value)) watchSectionSorts[key] = value;
      }
    }
    return {
      libraryBrowse: { sort, category },
      watchSections,
      watchSectionSorts,
      historyCollapsed: obj.historyCollapsed === true,
      skipSectionRemoveConfirm: obj.skipSectionRemoveConfirm === true,
      showNextUpCarousel: obj.showNextUpCarousel !== false,
      browseView: obj.browseView === "grid" ? "grid" : "list",
    };
  } catch {
    return null;
  }
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

function toSettings(kv: Map<string, string>, avatarUpdatedAt: string | null): Settings {
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
    uiPrefs: parseUiPrefs(kv.get("ui_prefs")),
    bannerRef: kv.get("banner_ref") ?? null,
    avatarRef: avatarUpdatedAt,
  };
}

export function getSettings(db: LibraryDatabase): Settings {
  return toSettings(readAll(db), getAvatarUpdatedAt(db));
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
  if (patch.uiPrefs !== undefined) {
    if (patch.uiPrefs === null) remove(db, "ui_prefs");
    else upsert(db, "ui_prefs", JSON.stringify(patch.uiPrefs));
  }
  if (patch.bannerRef !== undefined) {
    if (patch.bannerRef === null) remove(db, "banner_ref");
    else upsert(db, "banner_ref", patch.bannerRef);
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

export interface AvatarData {
  mimeType: string;
  data: Buffer;
}

/**
 * WP4 (0006_profile_media migration): the uploaded profile photo's raw
 * bytes, in the dedicated `profile_media` BLOB table (not base64-in-
 * `settings` — avoids ~33% text bloat on a binary payload). `updatedAt`
 * doubles as Settings.avatarRef's cache-busting token. `banner_ref` stays a
 * plain `settings` key (a small string ImageRef needs no dedicated table).
 */
export function setAvatar(
  db: LibraryDatabase,
  mimeType: string,
  data: Buffer,
  updatedAt: string,
): void {
  db.insert(schema.profileMedia)
    .values({ kind: "avatar", mimeType, data, updatedAt })
    .onConflictDoUpdate({ target: schema.profileMedia.kind, set: { mimeType, data, updatedAt } })
    .run();
}

export function getAvatar(db: LibraryDatabase): AvatarData | undefined {
  const row = db
    .select({ mimeType: schema.profileMedia.mimeType, data: schema.profileMedia.data })
    .from(schema.profileMedia)
    .where(eq(schema.profileMedia.kind, "avatar"))
    .get();
  return row ? { mimeType: row.mimeType, data: row.data as Buffer } : undefined;
}

function getAvatarUpdatedAt(db: LibraryDatabase): string | null {
  const row = db
    .select({ updatedAt: schema.profileMedia.updatedAt })
    .from(schema.profileMedia)
    .where(eq(schema.profileMedia.kind, "avatar"))
    .get();
  return row?.updatedAt ?? null;
}

/** Danger zone (resetLibrary) + zip "replace" import — clears the uploaded photo. */
export function clearAvatar(db: LibraryDatabase): void {
  db.delete(schema.profileMedia).where(eq(schema.profileMedia.kind, "avatar")).run();
}
