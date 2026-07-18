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

  it("pins yesterday / today / tomorrow", () => {
    expect(timelineBucketForDate("2026-07-17", friday)).toBe("today");
    expect(timelineBucketForDate("2026-07-16", friday)).toBe("yesterday");
    expect(timelineBucketForDate("2026-07-18", friday)).toBe("tomorrow");
  });

  it("puts other same-week days in thisWeek", () => {
    expect(timelineBucketForDate("2026-07-13", friday)).toBe("thisWeek"); // Mon
    expect(timelineBucketForDate("2026-07-14", friday)).toBe("thisWeek"); // Tue
    expect(timelineBucketForDate("2026-07-19", friday)).toBe("thisWeek"); // Sun
  });

  it("puts the previous ISO week in lastWeek (except yesterday)", () => {
    expect(timelineBucketForDate("2026-07-06", friday)).toBe("lastWeek"); // Mon
    expect(timelineBucketForDate("2026-07-12", friday)).toBe("lastWeek"); // Sun
  });

  it("classifies further past / future", () => {
    expect(timelineBucketForDate("2026-06-30", friday)).toBe("earlier");
    expect(timelineBucketForDate("2026-07-20", friday)).toBe("later");
  });

  it("on Monday, yesterday wins over lastWeek", () => {
    const monday = "2026-07-13";
    expect(timelineBucketForDate("2026-07-12", monday)).toBe("yesterday");
    expect(timelineBucketForDate("2026-07-06", monday)).toBe("lastWeek");
  });
});

describe("groupIntoTimelineSections", () => {
  it("coalesces consecutive same-bucket days and may repeat thisWeek", () => {
    const friday = "2026-07-17";
    const days = [
      { date: "2026-07-06" }, // lastWeek
      { date: "2026-07-07" }, // lastWeek
      { date: "2026-07-13" }, // thisWeek (Mon)
      { date: "2026-07-14" }, // thisWeek (Tue)
      { date: "2026-07-16" }, // yesterday
      { date: "2026-07-17" }, // today
      { date: "2026-07-18" }, // tomorrow
      { date: "2026-07-19" }, // thisWeek (Sun)
      { date: "2026-07-20" }, // later
    ];

    const sections = groupIntoTimelineSections(days, friday);
    expect(sections.map((s) => s.bucket)).toEqual([
      "lastWeek",
      "thisWeek",
      "yesterday",
      "today",
      "tomorrow",
      "thisWeek",
      "later",
    ]);
    expect(sections[0]?.days).toHaveLength(2);
    expect(sections[1]?.days.map((d) => d.date)).toEqual(["2026-07-13", "2026-07-14"]);
    expect(sections[5]?.days.map((d) => d.date)).toEqual(["2026-07-19"]);
  });
});

describe("bucketNeedsDaySubheaders", () => {
  it("only multi-day relative buckets need subheaders", () => {
    expect(bucketNeedsDaySubheaders("today")).toBe(false);
    expect(bucketNeedsDaySubheaders("yesterday")).toBe(false);
    expect(bucketNeedsDaySubheaders("tomorrow")).toBe(false);
    expect(bucketNeedsDaySubheaders("thisWeek")).toBe(true);
    expect(bucketNeedsDaySubheaders("earlier")).toBe(true);
  });
});
