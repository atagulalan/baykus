import { getAbsoluteWeek } from "./date.ts";

/** Relative timeline sections (E145). Order follows chronological coalescing. */
export type TimelineBucketId = "earlier" | "today" | "laterThisWeek" | "later";

/** Shift a plain YYYY-MM-DD calendar date by `days` (UTC date arithmetic). */
export function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
