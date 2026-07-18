import type { TFunction } from "i18next";

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

export type DurationParts =
  | { mode: "yearsDaysHours"; years: number; days: number; hours: number }
  | { mode: "monthsDaysHours"; months: number; days: number; hours: number }
  | { mode: "daysHours"; days: number; hours: number }
  | { mode: "hoursMinutes"; hours: number; minutes: number };

/**
 * ui.md Hero: days+hours once the total reaches a full day, else
 * hours+minutes; months+days+hours from 30 days.
 *
 * WP4 (spec 010): a `yearsDaysHours` tier from 365 days, for the profile
 * page's compact time-spent tile (e.g. `8y 21g 4s`). `days` is the remainder
 * after whole years (0-364), same shape as `daysHours`'s day/hour pair — not
 * a 4th `months` field stacked under `years`, since the brief's own example
 * omits months once the total is multi-year. <!-- DECISION: no normative
 * source pins the years-tier shape; this is the smallest reasonable
 * extension that matches the brief's example exactly. -->
 */
export function formatDurationParts(totalMin: number): DurationParts {
  const totalHours = Math.floor(totalMin / 60);
  if (totalHours >= 24) {
    const totalDays = Math.floor(totalHours / 24);
    if (totalDays >= 365) {
      return {
        mode: "yearsDaysHours",
        years: Math.floor(totalDays / 365),
        days: totalDays % 365,
        hours: totalHours % 24,
      };
    }
    if (totalDays >= 30) {
      return {
        mode: "monthsDaysHours",
        months: Math.floor(totalDays / 30),
        days: totalDays % 30,
        hours: totalHours % 24,
      };
    }
    return { mode: "daysHours", days: totalDays, hours: totalHours % 24 };
  }
  return { mode: "hoursMinutes", hours: totalHours, minutes: totalMin % 60 };
}

/**
 * Shared by every `DurationParts` consumer (stats/* sections and the profile
 * page's time-spent tile) — turns parts + an i18next-shaped translator into
 * the "Xy Xg Xs" display string, using the `stats.duration.*` catalog keys.
 * `t` is typed as `i18next`'s `TFunction` (not `react-i18next`) so this stays
 * a plain lib function — `useTranslation()`'s `t` satisfies it directly.
 */
export function formatDurationLabel(parts: DurationParts, t: TFunction): string {
  switch (parts.mode) {
    case "yearsDaysHours":
      return t("stats.duration.yearsDaysHours", {
        years: parts.years,
        days: parts.days,
        hours: parts.hours,
      });
    case "monthsDaysHours":
      return t("stats.duration.monthsDaysHours", {
        months: parts.months,
        days: parts.days,
        hours: parts.hours,
      });
    case "daysHours":
      return t("stats.duration.daysHours", { days: parts.days, hours: parts.hours });
    case "hoursMinutes":
      return t("stats.duration.hoursMinutes", { hours: parts.hours, minutes: parts.minutes });
  }
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
