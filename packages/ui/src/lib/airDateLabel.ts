import { type AiringFields, msUntilAir, todayIso } from "./airing.ts";

const MS_PER_DAY = 86_400_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1_000;

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

/**
 * Whole calendar days until `airDate` when it is strictly after `today`
 * (YYYY-MM-DD). `null` when unknown, already aired, or airing today.
 */
export function daysUntilAir(airDate: string | null, today: string = todayIso()): number | null {
  if (airDate === null || airDate <= today) return null;
  return calendarDaysBetween(today, airDate);
}

/** Trailing mark for unaired episodes (011 E151, extended for airStamp precision). */
export type UnairedTrailingState =
  | { kind: "countdown"; days: number }
  | { kind: "countdownClock"; hours: number }
  | { kind: "countdownMinutes"; minutes: number }
  | { kind: "countdownSeconds"; seconds: number }
  | { kind: "tbd" }
  | { kind: "none" };

function countdownFromMs(ms: number): UnairedTrailingState {
  if (ms >= MS_PER_DAY) {
    return { kind: "countdown", days: Math.ceil(ms / MS_PER_DAY) };
  }
  const totalMinutes = Math.ceil(ms / MS_PER_MINUTE);
  if (totalMinutes >= 60) {
    // Round up to whole hours so the mark matches the day/minute buckets
    // (a single big number + unit) instead of a clock-time-looking "13:38".
    return { kind: "countdownClock", hours: Math.ceil(totalMinutes / 60) };
  }
  if (ms >= MS_PER_MINUTE) {
    return { kind: "countdownMinutes", minutes: totalMinutes };
  }
  return { kind: "countdownSeconds", seconds: Math.max(Math.ceil(ms / MS_PER_SECOND), 1) };
}

/**
 * Future air instant → minute/hour/day countdown; null schedule → TBD; aired → none.
 */
export function unairedTrailingState(
  airDate: string | null,
  today: string = todayIso(),
  airStamp?: string | null,
  now = Date.now(),
): UnairedTrailingState {
  const ms = msUntilAir({ airDate, airStamp }, now);
  if (ms != null) return countdownFromMs(ms);
  if (airDate === null && !airStamp) return { kind: "tbd" };
  if (airDate !== null) {
    const days = daysUntilAir(airDate, today);
    if (days != null) return { kind: "countdown", days };
  }
  return { kind: "none" };
}

/** @deprecated use unairedTrailingState with AiringFields */
export function unairedTrailingStateFromEpisode(ep: AiringFields, today?: string, now?: number) {
  return unairedTrailingState(ep.airDate, today, ep.airStamp, now);
}
