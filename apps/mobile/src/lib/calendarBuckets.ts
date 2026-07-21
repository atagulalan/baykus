import type { CalendarDay, CalendarEntry } from "@baykus/api-client";
import { getAbsoluteWeek, todayIso } from "@baykus/ui";

/** Relative timeline sections (E145). */
export type TimelineBucketId = "earlier" | "today" | "laterThisWeek" | "later";

export function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dateIsoLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Prefer local date of `airStamp` when known (web calendarBuckets parity). */
export function calendarDisplayDate(entry: Pick<CalendarEntry, "airDate" | "airStamp">): string {
  if (entry.airStamp) return dateIsoLocal(new Date(entry.airStamp));
  return entry.airDate;
}

function entrySortKey(entry: CalendarEntry): string {
  return entry.airStamp ?? `${entry.airDate}T00:00:00Z`;
}

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

export function timelineBucketForDate(date: string, today: string): TimelineBucketId {
  if (date === today) return "today";
  if (date < today) return "earlier";
  if (getAbsoluteWeek(date) === getAbsoluteWeek(today)) return "laterThisWeek";
  return "later";
}

export interface TimelineSection<T extends { date: string }> {
  bucket: TimelineBucketId;
  days: T[];
}

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

export function bucketNeedsDaySubheaders(bucket: TimelineBucketId): boolean {
  return bucket === "earlier" || bucket === "laterThisWeek" || bucket === "later";
}

/** E24: hide past watched rows for gap-tracker surfaces. */
export function filterGapTrackerEntries(
  entries: CalendarEntry[],
  today: string = todayIso(),
): CalendarEntry[] {
  return entries.filter((e) => {
    const day = calendarDisplayDate(e);
    if (day >= today) return true;
    return !e.isWatched;
  });
}
