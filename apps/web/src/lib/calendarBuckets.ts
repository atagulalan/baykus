import { getAbsoluteWeek } from "./date.ts";

/** Relative timeline sections (E145). Order follows chronological coalescing. */
export type TimelineBucketId =
  | "earlier"
  | "lastWeek"
  | "yesterday"
  | "today"
  | "tomorrow"
  | "thisWeek"
  | "later";

/** Shift a plain YYYY-MM-DD calendar date by `days` (UTC date arithmetic). */
export function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Assign a relative bucket. Specific days (yesterday/today/tomorrow) win over
 * week buckets; remaining same-ISO-week days → thisWeek; previous ISO week →
 * lastWeek; everything else → earlier / later.
 */
export function timelineBucketForDate(date: string, today: string): TimelineBucketId {
  const yesterday = addDaysIso(today, -1);
  const tomorrow = addDaysIso(today, 1);
  if (date === today) return "today";
  if (date === tomorrow) return "tomorrow";
  if (date === yesterday) return "yesterday";

  const todayWeek = getAbsoluteWeek(today);
  const dateWeek = getAbsoluteWeek(date);
  if (dateWeek === todayWeek) return "thisWeek";
  if (dateWeek === todayWeek - 1) return "lastWeek";
  if (date < today) return "earlier";
  return "later";
}

export interface TimelineSection<T extends { date: string }> {
  bucket: TimelineBucketId;
  days: T[];
}

/**
 * Group chronologically ordered days into consecutive same-bucket sections.
 * "Bu hafta" may appear twice (earlier this week + later this week) so scroll
 * order stays chronological.
 */
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
  return (
    bucket === "earlier" || bucket === "lastWeek" || bucket === "thisWeek" || bucket === "later"
  );
}
