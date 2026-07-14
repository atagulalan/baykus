import { parseCsvRecords } from "./csv.ts";

/** Assignable to @baykus/core's identical TrackingStatus — importer-tvtime must not depend on @baykus/core. */
export type TvTimeStatus = "watching" | "plan_to_watch" | "completed" | "dropped" | "paused";

export interface TvTimeShow {
  /** TV Time's tv_show_id is TheTVDB's own numeric show id — confirmed against fixtures/tvmaze's externals.thetvdb field. */
  tvdbId: number;
  name: string;
  followedAt: string;
  status?: TvTimeStatus;
}

export interface TvTimeWatchEvent {
  tvdbShowId: number;
  /** TheTVDB's own numeric episode id — TV Time never exposes season/episode numbers directly. */
  tvdbEpisodeId: number;
  watchedAt: string;
  /** Present only for name-keyed rows (see NAME_KEYED_WATCH_COLUMNS) — lets the caller skip the network tvdbEpisodeId resolution entirely. */
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface TvTimeParsed {
  shows: TvTimeShow[];
  watches: TvTimeWatchEvent[];
}

const FOLLOWED_SHOW_COLUMNS = ["tv_show_id", "tv_show_name"];
/**
 * Live followed_tv_show.csv carries at least one of these; other GDPR files
 * that merely happen to include tv_show_id+tv_show_name (addiction scores,
 * recommendations, emotion counts, …) do not. Preferring these avoids
 * matching hundreds of junk "shows" and stalling the report endpoint on
 * sequential TVmaze lookups.
 */
const FOLLOWED_SHOW_PREFERRED_COLUMNS = ["active", "diffusion", "archived"];
const SEEN_EPISODE_COLUMNS = ["tv_show_id", "episode_id"];
const TRACKING_V1_COLUMNS = ["series_id", "episode_id"];
const TRACKING_V2_COLUMNS = ["s_id", "ep_id"];
const SPECIAL_STATUS_COLUMNS = ["tv_show_id", "status"];
/**
 * Current real-world TV Time exports (2026) dropped tv_show_id from every
 * per-episode-watch file (seen_episode_source.csv, watched_on_episode.csv,
 * rewatched_episode.csv, seen_episode_latest.csv all share this shape) —
 * confirmed against a live GDPR export, not just the older synthetic
 * fixture. Only tv_show_name identifies the show now, so these rows must be
 * joined against the shows list by name (see nameKey/tvdbIdByName below).
 * The upside: season/episode numbers are given directly, so callers no
 * longer need a network round-trip per watch event to resolve them.
 */
const NAME_KEYED_WATCH_COLUMNS = [
  "tv_show_name",
  "episode_id",
  "episode_season_number",
  "episode_number",
];
/** Columns that mark an episode-shaped CSV as non-watch (emotion/vote/comments). */
const NAME_KEYED_WATCH_NOISE_COLUMNS = [
  "emotion_id",
  "show_character_id",
  "fb_action_id",
  "last_comment_read_date",
  "comment_type",
  "watched_on_source_id",
];

function hasColumns(headers: string[], required: string[]): boolean {
  return required.every((col) => headers.includes(col));
}

function hasAnyColumn(headers: string[], candidates: string[]): boolean {
  return candidates.some((col) => headers.includes(col));
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** TV Time timestamps are space-separated with no timezone marker; research.md: treat as UTC. */
function toIso(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const normalized = raw.trim().replace(" ", "T");
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

type WatchFileKind = "seenEpisode" | "trackingV1" | "trackingV2" | "nameKeyedWatch";

type FileKind = WatchFileKind | "showsPreferred" | "showsFallback" | "specialStatus" | "unknown";

const WATCH_FILE_KINDS: readonly WatchFileKind[] = [
  "seenEpisode",
  "trackingV1",
  "trackingV2",
  "nameKeyedWatch",
];

function isWatchFileKind(kind: FileKind): kind is WatchFileKind {
  return (WATCH_FILE_KINDS as readonly FileKind[]).includes(kind);
}

/**
 * A file's kind is mutually exclusive — determined once, by priority — even
 * though some real files (e.g. show_seen_episode_latest.csv) satisfy more
 * than one column set at once (it has tv_show_id + episode_id AND
 * tv_show_id + tv_show_name). SEEN_EPISODE_COLUMNS wins that overlap so such
 * a file is treated purely as watch data, matching this function's original,
 * narrower behavior — classifying it as "shows" too would double-count it:
 * once as a followed show (with a bogus followedAt taken from a watch
 * timestamp) and once as a watch event.
 *
 * showsPreferred (live followed_tv_show.csv) beats showsFallback (minimal
 * fixture/older exports). When any preferred file is present, fallback show
 * files are ignored entirely — otherwise addiction scores etc. inflate the
 * show list ~3× and the match phase appears hung under TVmaze's 20/10s cap.
 */
function classify(headers: string[]): FileKind {
  if (hasColumns(headers, SPECIAL_STATUS_COLUMNS)) return "specialStatus";
  if (hasColumns(headers, SEEN_EPISODE_COLUMNS)) return "seenEpisode";
  if (hasColumns(headers, TRACKING_V1_COLUMNS)) return "trackingV1";
  if (hasColumns(headers, TRACKING_V2_COLUMNS)) return "trackingV2";
  if (
    hasColumns(headers, NAME_KEYED_WATCH_COLUMNS) &&
    !hasAnyColumn(headers, NAME_KEYED_WATCH_NOISE_COLUMNS)
  ) {
    return "nameKeyedWatch";
  }
  if (hasColumns(headers, FOLLOWED_SHOW_COLUMNS)) {
    if (hasAnyColumn(headers, FOLLOWED_SHOW_PREFERRED_COLUMNS)) return "showsPreferred";
    return "showsFallback";
  }
  return "unknown";
}

/**
 * Detects each file's kind by its header row (never by filename — TV Time's
 * real export filenames have varied over the years, per research.md) and
 * accumulates shows/watches across every recognized file. Unrecognized
 * files (e.g. future GDPR export additions) are silently skipped.
 *
 * Two passes: name-keyed watch rows (see NAME_KEYED_WATCH_COLUMNS) only
 * carry tv_show_name, so they need the full shows list — built in pass one —
 * to resolve a tvdbShowId, regardless of which file appears first in the zip.
 */
function recordsToShows(
  records: Record<string, string>[],
  specialStatuses?: Map<number, string>,
): TvTimeShow[] {
  const shows: TvTimeShow[] = [];
  for (const record of records) {
    const tvdbId = Number.parseInt(record.tv_show_id ?? "", 10);
    if (!Number.isFinite(tvdbId) || !record.tv_show_name) continue;

    let status: TvTimeStatus = "watching";
    const special = specialStatuses?.get(tvdbId);
    if (special === "for_later") {
      status = "plan_to_watch";
    } else if (record.active === "0") {
      status = "dropped";
    } else if (record.archived === "1") {
      status = "paused";
    }

    shows.push({
      tvdbId,
      name: record.tv_show_name,
      followedAt: toIso(record.created_at),
      status,
    });
  }
  return shows;
}

/** First row for each tvdbId wins — GDPR zips often repeat the same show across files. */
function dedupeShows(shows: TvTimeShow[]): TvTimeShow[] {
  const byId = new Map<number, TvTimeShow>();
  for (const show of shows) {
    if (!byId.has(show.tvdbId)) byId.set(show.tvdbId, show);
  }
  return [...byId.values()];
}

/** research.md: real cross-file drift observed <1 min apart; real rewatches observed >1 day apart. */
const DUPLICATE_WATCH_WINDOW_MS = 60_000;

/**
 * The same watch can appear in up to five real-export files (source,
 * latest-summaries, tracking v1/v2) with timestamps drifting by seconds —
 * addWatch()'s exact-timestamp dedupe misses these. Collapses watches
 * sharing (tvdbShowId, tvdbEpisodeId) within a 60s window down to the
 * earliest one; pairs farther apart survive as separate (genuine rewatch)
 * watches.
 */
function collapseDriftingDuplicates(watches: TvTimeWatchEvent[]): TvTimeWatchEvent[] {
  const byPair = new Map<string, TvTimeWatchEvent[]>();
  for (const watch of watches) {
    const key = `${watch.tvdbShowId}:${watch.tvdbEpisodeId}`;
    const group = byPair.get(key);
    if (group) group.push(watch);
    else byPair.set(key, [watch]);
  }

  const collapsed: TvTimeWatchEvent[] = [];
  for (const group of byPair.values()) {
    const sorted = [...group].sort((a, b) => Date.parse(a.watchedAt) - Date.parse(b.watchedAt));
    let lastKeptMs: number | null = null;
    for (const watch of sorted) {
      const ms = Date.parse(watch.watchedAt);
      if (lastKeptMs !== null && ms - lastKeptMs <= DUPLICATE_WATCH_WINDOW_MS) continue;
      collapsed.push(watch);
      lastKeptMs = ms;
    }
  }
  return collapsed;
}

export function parseTvTimeFiles(fileContents: string[]): TvTimeParsed {
  const preferredShowRecords: Record<string, string>[] = [];
  const fallbackShowRecords: Record<string, string>[] = [];
  const specialStatuses = new Map<number, string>();
  const watches: TvTimeWatchEvent[] = [];
  // Only watch-bearing kinds are needed in pass two — shows/specialStatus are
  // already consumed above, and retaining every file's records here doubled
  // peak memory against a real, multi-hundred-thousand-row export.
  const parsedFiles: { kind: WatchFileKind; records: Record<string, string>[] }[] = [];

  for (const content of fileContents) {
    const records = parseCsvRecords(content);
    if (records.length === 0) continue;
    const headers = Object.keys(records[0] ?? {});
    const kind = classify(headers);
    if (isWatchFileKind(kind)) parsedFiles.push({ kind, records });

    if (kind === "specialStatus") {
      for (const record of records) {
        const tvdbId = Number.parseInt(record.tv_show_id ?? "", 10);
        if (Number.isFinite(tvdbId) && record.status) {
          specialStatuses.set(tvdbId, record.status);
        }
      }
    } else if (kind === "showsPreferred") {
      preferredShowRecords.push(...records);
    } else if (kind === "showsFallback") {
      fallbackShowRecords.push(...records);
    }
  }

  const preferredShows = recordsToShows(preferredShowRecords, specialStatuses);
  const fallbackShows = recordsToShows(fallbackShowRecords, specialStatuses);

  // Live exports always include followed_tv_show.csv (preferred). Fall back
  // only for synthetic fixtures / older minimal exports that lack `active`.
  const shows = dedupeShows(preferredShows.length > 0 ? preferredShows : fallbackShows);

  const tvdbIdByName = new Map<string, number>();
  for (const show of shows) {
    const key = nameKey(show.name);
    if (!tvdbIdByName.has(key)) tvdbIdByName.set(key, show.tvdbId);
  }

  for (const { kind, records } of parsedFiles) {
    if (kind === "seenEpisode") {
      for (const record of records) {
        const tvdbShowId = Number.parseInt(record.tv_show_id ?? "", 10);
        const tvdbEpisodeId = Number.parseInt(record.episode_id ?? "", 10);
        if (!Number.isFinite(tvdbShowId) || !Number.isFinite(tvdbEpisodeId)) continue;
        watches.push({
          tvdbShowId,
          tvdbEpisodeId,
          watchedAt: toIso(record.created_at || record.updated_at),
        });
      }
    } else if (kind === "trackingV1") {
      for (const record of records) {
        if (record.type !== "watch" && record.type !== "rewatch") continue;
        const tvdbShowId = Number.parseInt(record.series_id ?? "", 10);
        const tvdbEpisodeId = Number.parseInt(record.episode_id ?? "", 10);
        if (!Number.isFinite(tvdbShowId) || !Number.isFinite(tvdbEpisodeId)) continue;
        const watch: TvTimeWatchEvent = {
          tvdbShowId,
          tvdbEpisodeId,
          watchedAt: toIso(record.created_at || record.watch_date || record.updated_at),
        };
        const seasonNumber = Number.parseInt(record.season_number ?? "", 10);
        const episodeNumber = Number.parseInt(record.episode_number ?? "", 10);
        if (Number.isFinite(seasonNumber) && Number.isFinite(episodeNumber)) {
          watch.seasonNumber = seasonNumber;
          watch.episodeNumber = episodeNumber;
        }
        watches.push(watch);
      }
    } else if (kind === "trackingV2") {
      for (const record of records) {
        const key = record.key ?? "";
        if (!key.startsWith("watch-episode") && !key.startsWith("rewatch-episode")) continue;
        const tvdbShowId = Number.parseInt(record.s_id ?? "", 10);
        const tvdbEpisodeId = Number.parseInt(record.ep_id ?? "", 10);
        if (!Number.isFinite(tvdbShowId) || !Number.isFinite(tvdbEpisodeId)) continue;
        const watch: TvTimeWatchEvent = {
          tvdbShowId,
          tvdbEpisodeId,
          watchedAt: toIso(record.created_at || record.updated_at),
        };
        const seasonNumber = Number.parseInt(record.season_number ?? record.s_no ?? "", 10);
        const episodeNumber = Number.parseInt(record.episode_number ?? record.ep_no ?? "", 10);
        if (Number.isFinite(seasonNumber) && Number.isFinite(episodeNumber)) {
          watch.seasonNumber = seasonNumber;
          watch.episodeNumber = episodeNumber;
        }
        watches.push(watch);
      }
    } else if (kind === "nameKeyedWatch") {
      for (const record of records) {
        const tvdbShowId = tvdbIdByName.get(nameKey(record.tv_show_name ?? ""));
        const tvdbEpisodeId = Number.parseInt(record.episode_id ?? "", 10);
        if (tvdbShowId === undefined || !Number.isFinite(tvdbEpisodeId)) continue;

        const watch: TvTimeWatchEvent = {
          tvdbShowId,
          tvdbEpisodeId,
          watchedAt: toIso(record.created_at || record.updated_at),
        };
        const seasonNumber = Number.parseInt(record.episode_season_number ?? "", 10);
        const episodeNumber = Number.parseInt(record.episode_number ?? "", 10);
        if (Number.isFinite(seasonNumber) && Number.isFinite(episodeNumber)) {
          watch.seasonNumber = seasonNumber;
          watch.episodeNumber = episodeNumber;
        }
        watches.push(watch);
      }
    }
  }

  return { shows, watches: collapseDriftingDuplicates(watches) };
}
