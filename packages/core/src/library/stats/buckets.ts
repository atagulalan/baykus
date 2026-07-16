/**
 * E96/E104/E105: local (timezone-aware) calendar math for the time-bucketed
 * stats aggregates. Everything here operates on already-validated IANA zone
 * names — validation/fallback-to-UTC lives at the server boundary (M48).
 */

export interface LocalMoment {
  /** "YYYY-MM-DD" in the target zone. */
  dateStr: string;
  year: number;
  /** 1-12. */
  month: number;
  /** 0-23. */
  hour: number;
  /** 0 = Monday .. 6 = Sunday (E107). */
  weekdayMonFirst: number;
  /** ISO-8601 week-year — may differ from `year` in late Dec/early Jan (E105). */
  isoYear: number;
  /** ISO-8601 week number, 1-53. */
  isoWeek: number;
  /** Epoch ms of this local date's ISO week's Monday 00:00 (UTC-anchored, for streak arithmetic). */
  weekStartMs: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Standard nearest-Thursday ISO-8601 week algorithm, applied to a UTC-anchored Y-M-D. */
function isoWeekOf(
  year: number,
  month: number,
  day: number,
): Pick<LocalMoment, "isoYear" | "isoWeek" | "weekStartMs"> {
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  const dayNumMonFirst = (asUtc.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  const monday = new Date(asUtc.getTime() - dayNumMonFirst * MS_PER_DAY);
  const thursday = new Date(monday.getTime() + 3 * MS_PER_DAY);
  const isoYear = thursday.getUTCFullYear();

  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNumMonFirst = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4DayNumMonFirst * MS_PER_DAY);

  const isoWeek = Math.round((monday.getTime() - week1Monday.getTime()) / MS_PER_WEEK) + 1;
  return { isoYear, isoWeek, weekStartMs: monday.getTime() };
}

/**
 * Builds a resolver that maps an ISO instant to its local calendar moment in `tz`.
 * Constructs one Intl.DateTimeFormat per call — callers should build one resolver
 * per stats request and reuse it across every row (plan.md §Core layout).
 */
export function createLocalResolver(tz: string): (iso: string) => LocalMoment {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  return (iso: string): LocalMoment => {
    const parts = dtf.formatToParts(new Date(iso));
    const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
    const year = get("year");
    const month = get("month");
    const day = get("day");
    // Some ICU builds format midnight as "24" under hour12:false.
    const rawHour = get("hour");
    const hour = rawHour === 24 ? 0 : rawHour;

    const weekdaySun0 = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const weekdayMonFirst = (weekdaySun0 + 6) % 7;

    return {
      dateStr: `${year}-${pad2(month)}-${pad2(day)}`,
      year,
      month,
      hour,
      weekdayMonFirst,
      ...isoWeekOf(year, month, day),
    };
  };
}
