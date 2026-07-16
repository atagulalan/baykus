import type { LibraryDatabase } from "../../db/open.ts";
import { computeTotals, type Totals } from "./totals.ts";

export type { NamedCount, RewatchedEpisode, SeriesEpisodeProgress, Totals } from "./totals.ts";

/** Grows with M47's timeline aggregates (recent, pace, upcoming, binges, streaks, timeByYear, activityByDay, byWeekday, byHour). */
export interface Stats extends Totals {}

/** contracts/api.md §stats. Existing fields stay byte-compatible across 008 (E111). */
export function getStats(db: LibraryDatabase): Stats {
  return computeTotals(db);
}
