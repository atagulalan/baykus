import type { LibraryDatabase } from "../../db/open.ts";
import { computeTimeline, type Timeline } from "./timeline.ts";
import { computeTotals, type Totals } from "./totals.ts";

export type { Timeline } from "./timeline.ts";
export type { NamedCount, RewatchedEpisode, SeriesEpisodeProgress, Totals } from "./totals.ts";

export interface Stats extends Totals, Timeline {}

/**
 * contracts/api.md §stats. Existing fields stay byte-compatible across 008 (E111).
 * `tz` (E96): IANA zone for all local day/week/month/hour bucketing; defaults to
 * UTC so existing callers (pre-008 tests, `Library.getStats()`) compile and behave
 * unchanged. The server validates/falls back to UTC before calling this (M48).
 * `now` is test-only injection, same convention as category.ts's computeCategories.
 */
export function getStats(db: LibraryDatabase, tz = "UTC", now: Date = new Date()): Stats {
  const totals = computeTotals(db, now);
  const timeline = computeTimeline(db, tz, totals.backlog.episodes, now);
  return { ...totals, ...timeline };
}
