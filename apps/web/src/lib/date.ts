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

// 2019-12-30 was a Monday. We use it as the 0-point for absolute week indexing.
const EPOCH = new Date("2019-12-30T00:00:00Z").getTime();
const MS_PER_DAY = 86400000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export function getAbsoluteWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Math.floor((d - EPOCH) / MS_PER_WEEK);
}

export function getIsoWeek(dateStr: string): { year: number; week: number } {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const date = new Date(d.getTime());
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

export function getWeekStartIso(absoluteWeek: number): string {
  const d = new Date(EPOCH + absoluteWeek * MS_PER_WEEK);
  return d.toISOString().slice(0, 10);
}

export function getWeekRange(
  baseDateIso: string,
  weekOffset: number,
  spanWeeks: number,
): { from: string; to: string } {
  const baseW = getAbsoluteWeek(baseDateIso);
  const startW = baseW + weekOffset;
  const endW = startW + spanWeeks - 1;

  const startD = new Date(EPOCH + startW * MS_PER_WEEK);
  const endD = new Date(EPOCH + endW * MS_PER_WEEK + 6 * MS_PER_DAY);

  return {
    from: startD.toISOString().slice(0, 10),
    to: endD.toISOString().slice(0, 10),
  };
}
