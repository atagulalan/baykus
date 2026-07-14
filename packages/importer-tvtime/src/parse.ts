import { parseCsvRecords } from "./csv.ts";

export interface TvTimeShow {
  /** TV Time's tv_show_id is TheTVDB's own numeric show id — confirmed against fixtures/tvmaze's externals.thetvdb field. */
  tvdbId: number;
  name: string;
  followedAt: string;
}

export interface TvTimeWatchEvent {
  tvdbShowId: number;
  /** TheTVDB's own numeric episode id — TV Time never exposes season/episode numbers directly. */
  tvdbEpisodeId: number;
  watchedAt: string;
}

export interface TvTimeParsed {
  shows: TvTimeShow[];
  watches: TvTimeWatchEvent[];
}

const FOLLOWED_SHOW_COLUMNS = ["tv_show_id", "tv_show_name"];
const SEEN_EPISODE_COLUMNS = ["tv_show_id", "episode_id"];

function hasColumns(headers: string[], required: string[]): boolean {
  return required.every((col) => headers.includes(col));
}

/** TV Time timestamps are space-separated with no timezone marker; research.md: treat as UTC. */
function toIso(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const normalized = raw.trim().replace(" ", "T");
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/**
 * Detects each file's kind by its header row (never by filename — TV Time's
 * real export filenames have varied over the years, per research.md) and
 * accumulates shows/watches across every recognized file. Unrecognized
 * files (e.g. future GDPR export additions) are silently skipped.
 */
export function parseTvTimeFiles(fileContents: string[]): TvTimeParsed {
  const shows: TvTimeShow[] = [];
  const watches: TvTimeWatchEvent[] = [];

  for (const content of fileContents) {
    const records = parseCsvRecords(content);
    if (records.length === 0) continue;
    const headers = Object.keys(records[0] ?? {});

    if (hasColumns(headers, SEEN_EPISODE_COLUMNS)) {
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
    } else if (hasColumns(headers, FOLLOWED_SHOW_COLUMNS)) {
      for (const record of records) {
        const tvdbId = Number.parseInt(record.tv_show_id ?? "", 10);
        if (!Number.isFinite(tvdbId) || !record.tv_show_name) continue;
        shows.push({
          tvdbId,
          name: record.tv_show_name,
          followedAt: toIso(record.created_at),
        });
      }
    }
  }

  return { shows, watches };
}
