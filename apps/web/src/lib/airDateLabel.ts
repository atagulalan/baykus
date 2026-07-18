import { todayIso } from "./date.ts";

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

export interface FormatAirDateLabelOptions {
  /** Override "today" for tests (YYYY-MM-DD). */
  today?: string;
  /** Skip relative labels (dün / bugün / yarın / geçen hafta); always absolute. */
  isAbsoluteDate?: boolean;
}

/**
 * Near air dates as relative labels (tomorrow / today / yesterday / last week);
 * otherwise a long absolute date. Pass `isAbsoluteDate: true` to always use the
 * absolute form (e.g. episode details modal). Uses `Intl.RelativeTimeFormat`
 * so tr/en come from the runtime — no catalog keys required.
 */
export function formatAirDateLabel(
  airDate: string,
  locale: string,
  opts: FormatAirDateLabelOptions = {},
): string {
  if (opts.isAbsoluteDate) return formatAbsoluteAirDate(airDate, locale);

  const today = opts.today ?? todayIso();
  const dayDiff = calendarDaysBetween(today, airDate);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (dayDiff === 1) return capitalize(rtf.format(1, "day"), locale);
  if (dayDiff === 0) return capitalize(rtf.format(0, "day"), locale);
  if (dayDiff === -1) return capitalize(rtf.format(-1, "day"), locale);
  if (dayDiff >= -7 && dayDiff <= -2) return capitalize(rtf.format(-1, "week"), locale);

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

/** Trailing mark for unaired episodes (011 E151). */
export type UnairedTrailingState =
  | { kind: "countdown"; days: number }
  | { kind: "tbd" }
  | { kind: "none" };

/**
 * Future airDate → countdown; null airDate → TBD; aired/today → none
 * (caller shows the checkbox / rewatch control).
 */
export function unairedTrailingState(
  airDate: string | null,
  today: string = todayIso(),
): UnairedTrailingState {
  if (airDate === null) return { kind: "tbd" };
  const days = daysUntilAir(airDate, today);
  if (days != null) return { kind: "countdown", days };
  return { kind: "none" };
}

/**
 * Localized unit word for a day count ("gün" / "day" / "days") via
 * `Intl.NumberFormat` — no catalog keys.
 */
export function dayUnitLabel(days: number, locale: string): string {
  const parts = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "day",
    unitDisplay: "long",
  }).formatToParts(days);
  return parts.find((part) => part.type === "unit")?.value ?? "days";
}
