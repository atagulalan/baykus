import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  bucketNeedsDaySubheaders,
  groupIntoTimelineSections,
  timelineBucketForDate,
} from "./calendarBuckets.ts";

describe("addDaysIso", () => {
  it("shifts across month boundaries", () => {
    expect(addDaysIso("2026-07-01", -1)).toBe("2026-06-30");
    expect(addDaysIso("2026-07-31", 1)).toBe("2026-08-01");
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
    expect(sections.map((s) => s.bucket)).toEqual([
      "earlier",
      "today",
      "laterThisWeek",
      "later",
    ]);
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
