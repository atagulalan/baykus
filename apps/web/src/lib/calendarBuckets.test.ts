import { describe, expect, it } from "vitest";
import type { CalendarEntry } from "../api/types.ts";
import {
  addDaysIso,
  bucketNeedsDaySubheaders,
  calendarDisplayDate,
  groupIntoTimelineSections,
  rebucketCalendarDays,
  timelineBucketForDate,
} from "./calendarBuckets.ts";
import { dateIsoLocal } from "./date.ts";

function entry(
  partial: Pick<CalendarEntry, "episodeId" | "airDate" | "airStamp"> & Partial<CalendarEntry>,
): CalendarEntry {
  return {
    itemId: 1,
    title: "Show",
    posterRef: null,
    s: 1,
    e: 1,
    episodeTitle: null,
    episodeType: "standard",
    seasonName: null,
    network: null,
    watchProviders: [],
    isWatched: false,
    ...partial,
  };
}

describe("addDaysIso", () => {
  it("shifts across month boundaries", () => {
    expect(addDaysIso("2026-07-01", -1)).toBe("2026-06-30");
    expect(addDaysIso("2026-07-31", 1)).toBe("2026-08-01");
  });
});

describe("calendarDisplayDate / rebucketCalendarDays", () => {
  it("uses local airStamp day when present (Rick and Morty Sunday→Monday case)", () => {
    // US airDate Sunday; stamp is Monday 03:00Z → local day depends on TZ.
    const stamp = "2026-07-20T03:00:00Z";
    const localDay = dateIsoLocal(new Date(stamp));
    const ep = entry({
      episodeId: 909,
      airDate: "2026-07-19",
      airStamp: stamp,
    });
    expect(calendarDisplayDate(ep)).toBe(localDay);

    const days = rebucketCalendarDays([{ date: "2026-07-19", entries: [ep] }]);
    expect(days).toEqual([{ date: localDay, entries: [ep] }]);
  });

  it("falls back to airDate when airStamp is null", () => {
    const ep = entry({ episodeId: 1, airDate: "2026-07-19", airStamp: null });
    expect(calendarDisplayDate(ep)).toBe("2026-07-19");
    expect(rebucketCalendarDays([{ date: "2026-07-19", entries: [ep] }])).toEqual([
      { date: "2026-07-19", entries: [ep] },
    ]);
  });

  it("merges entries that land on the same local day from different airDates", () => {
    const stamp = "2026-07-20T03:00:00Z";
    const localDay = dateIsoLocal(new Date(stamp));
    const late = entry({
      episodeId: 2,
      airDate: "2026-07-19",
      airStamp: stamp,
    });
    const sameDay = entry({
      episodeId: 3,
      itemId: 2,
      airDate: localDay,
      airStamp: null,
    });
    const days = rebucketCalendarDays([
      { date: "2026-07-19", entries: [late] },
      { date: localDay, entries: [sameDay] },
    ]);
    const merged = days.find((d) => d.date === localDay);
    expect(merged?.entries.map((e) => e.episodeId).sort()).toEqual([2, 3]);
  });
});

describe("timelineBucketForDate", () => {
  // Friday 2026-07-17 — ISO week Mon 13 → Sun 19
  const friday = "2026-07-17";

  it("pins today and folds everything before into earlier", () => {
    expect(timelineBucketForDate("2026-07-17", friday)).toBe("today");
    expect(timelineBucketForDate("2026-07-16", friday)).toBe("earlier");
    expect(timelineBucketForDate("2026-07-13", friday)).toBe("earlier");
    expect(timelineBucketForDate("2026-07-06", friday)).toBe("earlier");
  });

  it("puts same-week days after today in laterThisWeek", () => {
    expect(timelineBucketForDate("2026-07-18", friday)).toBe("laterThisWeek");
    expect(timelineBucketForDate("2026-07-19", friday)).toBe("laterThisWeek");
  });

  it("puts future weeks in later", () => {
    expect(timelineBucketForDate("2026-07-20", friday)).toBe("later");
  });
});

describe("groupIntoTimelineSections", () => {
  it("coalesces consecutive same-bucket days around today", () => {
    const friday = "2026-07-17";
    const days = [
      { date: "2026-07-06" },
      { date: "2026-07-07" },
      { date: "2026-07-13" },
      { date: "2026-07-14" },
      { date: "2026-07-16" },
      { date: "2026-07-17" },
      { date: "2026-07-18" },
      { date: "2026-07-19" },
      { date: "2026-07-20" },
    ];

    const sections = groupIntoTimelineSections(days, friday);
    expect(sections.map((s) => s.bucket)).toEqual(["earlier", "today", "laterThisWeek", "later"]);
    expect(sections[0]?.days).toHaveLength(5);
    expect(sections[2]?.days.map((d) => d.date)).toEqual(["2026-07-18", "2026-07-19"]);
  });
});

describe("bucketNeedsDaySubheaders", () => {
  it("only multi-day relative buckets need subheaders", () => {
    expect(bucketNeedsDaySubheaders("today")).toBe(false);
    expect(bucketNeedsDaySubheaders("earlier")).toBe(true);
    expect(bucketNeedsDaySubheaders("laterThisWeek")).toBe(true);
    expect(bucketNeedsDaySubheaders("later")).toBe(true);
  });
});
