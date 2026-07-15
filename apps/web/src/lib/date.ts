/**
 * airDate values are plain "YYYY-MM-DD" calendar dates with no timezone of
 * their own. "Today" must therefore be the calendar date the viewer's own
 * device currently shows — LOCAL date components, never
 * `Date.toISOString().slice(0, 10)` (UTC), which silently points at the
 * wrong day for any timezone ahead of UTC (e.g. Turkey, UTC+3) during the
 * hours after local midnight but before UTC has rolled over.
 */
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
