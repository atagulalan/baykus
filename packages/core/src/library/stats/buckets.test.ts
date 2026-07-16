import { describe, expect, it } from "vitest";
import { createLocalResolver } from "./buckets.ts";

describe("createLocalResolver — weekday (E107)", () => {
  it("weekdayMonFirst matches getUTCDay() converted to Monday-first, for tz=UTC", () => {
    const resolve = createLocalResolver("UTC");
    for (let d = 1; d <= 7; d++) {
      const iso = `2026-01-0${d}T12:00:00Z`;
      const expected = (new Date(iso).getUTCDay() + 6) % 7;
      expect(resolve(iso).weekdayMonFirst).toBe(expected);
    }
  });
});

describe("createLocalResolver — tz day-boundary sensitivity", () => {
  it("Europe/Istanbul (fixed UTC+3, no DST since 2016) flips the calendar day near UTC midnight", () => {
    const resolve = createLocalResolver("Europe/Istanbul");
    const istanbul = resolve("2026-01-15T21:30:00Z");
    // 21:30 UTC + 3h = 00:30 the next day in Istanbul.
    expect(istanbul.hour).toBe(0);
    expect(istanbul.dateStr).toBe("2026-01-16");
  });

  it("UTC and Europe/Istanbul disagree on the calendar day for the same instant", () => {
    const resolveUtc = createLocalResolver("UTC");
    const resolveIstanbul = createLocalResolver("Europe/Istanbul");
    const instant = "2026-01-15T21:30:00Z";
    expect(resolveUtc(instant).dateStr).toBe("2026-01-15");
    expect(resolveIstanbul(instant).dateStr).toBe("2026-01-16");
  });
});

describe("createLocalResolver — DST zones", () => {
  it("America/New_York resolves the same UTC hour to different local hours across the DST transition", () => {
    const resolve = createLocalResolver("America/New_York");
    const winter = resolve("2026-01-15T17:00:00Z"); // EST, UTC-5
    const summer = resolve("2026-07-15T17:00:00Z"); // EDT, UTC-4
    expect(winter.hour).toBe(12);
    expect(summer.hour).toBe(13);
  });
});

describe("createLocalResolver — ISO week (E104/E105) year-boundary math", () => {
  it("Jan 4 is always ISO week 1 of its own calendar year (defining property)", () => {
    const resolve = createLocalResolver("UTC");
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]) {
      const result = resolve(`${year}-01-04T12:00:00Z`);
      expect(result.isoYear).toBe(year);
      expect(result.isoWeek).toBe(1);
    }
  });

  it("Jan 1-3 belong either to week 1 of the same year or the last week (52/53) of the previous year", () => {
    const resolve = createLocalResolver("UTC");
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]) {
      for (const day of [1, 2, 3]) {
        const result = resolve(`${year}-01-0${day}T12:00:00Z`);
        const sameYearWeek1 = result.isoYear === year && result.isoWeek === 1;
        const prevYearLastWeek = result.isoYear === year - 1 && result.isoWeek >= 52;
        expect(sameYearWeek1 || prevYearLastWeek).toBe(true);
      }
    }
  });

  it("Dec 29-31 belong either to the last week of the same year or week 1 of the next year", () => {
    const resolve = createLocalResolver("UTC");
    for (const year of [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
      for (const day of [29, 30, 31]) {
        const result = resolve(`${year}-12-${day}T12:00:00Z`);
        const sameYearLastWeek = result.isoYear === year && result.isoWeek >= 52;
        const nextYearWeek1 = result.isoYear === year + 1 && result.isoWeek === 1;
        expect(sameYearLastWeek || nextYearWeek1).toBe(true);
      }
    }
  });

  it("consecutive days within the same ISO week share dateStr-adjacent days but one weekStartMs, and it advances by exactly 7 days at the boundary", () => {
    const resolve = createLocalResolver("UTC");
    // 2026-01-04 is ISO week 1 of 2026 (defining property); walk a full week from there.
    const days = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 4 + i));
      return resolve(d.toISOString());
    });
    // First 7 days (Jan 4 is a Sunday per the defining property landing week1 — regardless of
    // which weekday Jan4 itself is, the 7 days from it span at most 2 ISO weeks).
    const distinctWeekStarts = new Set(days.map((d) => d.weekStartMs));
    expect(distinctWeekStarts.size).toBeLessThanOrEqual(2);
    // Whenever weekStartMs changes between two adjacent days, it must jump by exactly 7 days.
    for (let i = 1; i < days.length; i++) {
      const prev = days[i - 1];
      const curr = days[i];
      if (!prev || !curr) continue;
      if (curr.weekStartMs !== prev.weekStartMs) {
        expect(curr.weekStartMs - prev.weekStartMs).toBe(7 * 24 * 60 * 60 * 1000);
      }
    }
  });
});
