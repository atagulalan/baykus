import type { CalendarDay, CalendarEntry } from "../api/types.ts";
import { dateIsoLocal, getAbsoluteWeek } from "./date.ts";

/** Relative timeline sections (E145). Order follows chronological coalescing. */
export type TimelineBucketId = "earlier" | "today" | "laterThisWeek" | "later";

/** Shift a plain YYYY-MM-DD calendar date by `days` (UTC date arithmetic). */
export function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Day key for calendar UI. Prefer the viewer's local date of `airStamp`
 * when known — provider `airDate` is often the origin-network calendar day
 * (US Eastern), which can disagree with when the episode actually airs
 * locally (e.g. Adult Swim Sunday → Monday morning TRT).
 * <!-- DECISION: calendar Bugün / month / schedule day cells use local
 * airStamp day; airDate remains the API grouping key and fallback. -->
 */
export function calendarDisplayDate(entry: Pick<CalendarEntry, "airDate" | "airStamp">): string {
  if (entry.airStamp) return dateIsoLocal(new Date(entry.airStamp));
  return entry.airDate;
}

function entrySortKey(entry: CalendarEntry): string {
  return entry.airStamp ?? `${entry.airDate}T00:00:00Z`;
}

/** Regroup API days (keyed by airDate) onto the viewer's local air day. */
export function rebucketCalendarDays(days: CalendarDay[]): CalendarDay[] {
  const byDate = new Map<string, CalendarEntry[]>();
  for (const day of days) {
    for (const entry of day.entries) {
      const key = calendarDisplayDate(entry);
      const list = byDate.get(key) ?? [];
      list.push(entry);
      byDate.set(key, list);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) => {
        const ka = entrySortKey(a);
        const kb = entrySortKey(b);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      }),
    }));
}

/**
 * Assign a relative bucket. Everything before today → earlier; today → today;
 * same ISO week after today → laterThisWeek; else → later.
 */
export function timelineBucketForDate(date: string, today: string): TimelineBucketId {
  if (date === today) return "today";
  if (date < today) return "earlier";

  const todayWeek = getAbsoluteWeek(today);
  const dateWeek = getAbsoluteWeek(date);
  if (dateWeek === todayWeek) return "laterThisWeek";
  return "later";
}

export interface TimelineSection<T extends { date: string }> {
  bucket: TimelineBucketId;
  days: T[];
}

/** Group chronologically ordered days into consecutive same-bucket sections. */
export function groupIntoTimelineSections<T extends { date: string }>(
  days: T[],
  today: string,
): TimelineSection<T>[] {
  const sections: TimelineSection<T>[] = [];
  for (const day of days) {
    const bucket = timelineBucketForDate(day.date, today);
    const last = sections[sections.length - 1];
    if (last && last.bucket === bucket) {
      last.days.push(day);
    } else {
      sections.push({ bucket, days: [day] });
    }
  }
  return sections;
}

/** Single-day buckets don't need a weekday subheader under the section title. */
export function bucketNeedsDaySubheaders(bucket: TimelineBucketId): boolean {
  return bucket === "earlier" || bucket === "laterThisWeek" || bucket === "later";
}
