import type { TFunction } from "i18next";

export type DurationParts =
  | { mode: "yearsDaysHours"; years: number; days: number; hours: number }
  | { mode: "monthsDaysHours"; months: number; days: number; hours: number }
  | { mode: "daysHours"; days: number; hours: number }
  | { mode: "hoursMinutes"; hours: number; minutes: number };

/** Mirrors web `formatDurationParts` for stats/profile hero labels. */
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
