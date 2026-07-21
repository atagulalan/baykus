/** Absolute / ISO week helpers — shared by native ScheduleGrid (mirrors web `lib/date.ts`). */

// 2019-12-30 was a Monday. Epoch for absolute week indexing.
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

/** Monday-first weekday index (0 = Monday … 6 = Sunday). */
export function mondayFirstDow(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}
