import { todayIso } from "./airing.ts";

const MS_PER_DAY = 86_400_000;

/** Whole calendar days from `fromIso` to `toIso` (YYYY-MM-DD), UTC date math. */
export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const to = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((to - from) / MS_PER_DAY);
}

function capitalize(text: string, locale: string): string {
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

function formatAbsoluteAirDate(airDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${airDate}T00:00:00Z`));
}

/** Hermes (RN) often ships without `Intl.RelativeTimeFormat` — avoid `new` on undefined. */
function formatRelativeNear(dayDiff: number, locale: string): string | null {
  const RelativeTimeFormat = (
    Intl as typeof Intl & {
      RelativeTimeFormat?: new (
        locales?: string | string[],
        options?: Intl.RelativeTimeFormatOptions,
      ) => Intl.RelativeTimeFormat;
    }
  ).RelativeTimeFormat;

  if (typeof RelativeTimeFormat === "function") {
    try {
      const rtf = new RelativeTimeFormat(locale, { numeric: "auto" });
      if (dayDiff === 1) return capitalize(rtf.format(1, "day"), locale);
      if (dayDiff === 0) return capitalize(rtf.format(0, "day"), locale);
      if (dayDiff === -1) return capitalize(rtf.format(-1, "day"), locale);
      if (dayDiff >= -7 && dayDiff <= -2) return capitalize(rtf.format(-1, "week"), locale);
      return null;
    } catch {
      // fall through to static labels
    }
  }

  const tr = locale.toLowerCase().startsWith("tr");
  if (dayDiff === 1) return tr ? "Yarın" : "Tomorrow";
  if (dayDiff === 0) return tr ? "Bugün" : "Today";
  if (dayDiff === -1) return tr ? "Dün" : "Yesterday";
  if (dayDiff >= -7 && dayDiff <= -2) return tr ? "Geçen hafta" : "Last week";
  return null;
}

export type FormatAirDateLabelOptions = {
  today?: string;
  isAbsoluteDate?: boolean;
};

/**
 * Near air dates as relative labels; otherwise a long absolute date.
 * Mirrors web `formatAirDateLabel` (Intl when available — Hermes fallback for RTF).
 */
export function formatAirDateLabel(
  airDate: string,
  locale: string,
  opts: FormatAirDateLabelOptions = {},
): string {
  if (opts.isAbsoluteDate) return formatAbsoluteAirDate(airDate, locale);

  const today = opts.today ?? todayIso();
  const dayDiff = calendarDaysBetween(today, airDate);
  const relative = formatRelativeNear(dayDiff, locale);
  if (relative != null) return relative;

  return formatAbsoluteAirDate(airDate, locale);
}
