import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { formatDurationLabel, formatDurationParts } from "./date.ts";

describe("formatDurationParts", () => {
  it("uses hoursMinutes under a full day", () => {
    expect(formatDurationParts(90)).toEqual({ mode: "hoursMinutes", hours: 1, minutes: 30 });
    expect(formatDurationParts(0)).toEqual({ mode: "hoursMinutes", hours: 0, minutes: 0 });
    expect(formatDurationParts(23 * 60 + 59)).toEqual({
      mode: "hoursMinutes",
      hours: 23,
      minutes: 59,
    });
  });

  it("switches to daysHours at exactly 24 hours", () => {
    expect(formatDurationParts(24 * 60)).toEqual({ mode: "daysHours", days: 1, hours: 0 });
    expect(formatDurationParts(24 * 60 + 61)).toEqual({ mode: "daysHours", days: 1, hours: 1 });
  });

  it("switches to monthsDaysHours at exactly 30 days", () => {
    // 30 days = 30 * 24 hours
    const totalMin = 30 * 24 * 60;
    expect(formatDurationParts(totalMin)).toEqual({
      mode: "monthsDaysHours",
      months: 1,
      days: 0,
      hours: 0,
    });
  });

  it("matches the prototype's 181g 1s example (now 6m 1d 1h)", () => {
    // 181 days, 1 hour = (181*24 + 1) hours of minutes.
    const totalMin = (181 * 24 + 1) * 60;
    expect(formatDurationParts(totalMin)).toEqual({
      mode: "monthsDaysHours",
      months: 6,
      days: 1,
      hours: 1,
    });
  });

  it("switches to yearsDaysHours at exactly 365 days", () => {
    const totalMin = 365 * 24 * 60;
    expect(formatDurationParts(totalMin)).toEqual({
      mode: "yearsDaysHours",
      years: 1,
      days: 0,
      hours: 0,
    });
  });

  it("matches the profile tile's 8y 21g 4s example (WP4)", () => {
    // 8 years (365d each) + 21 days + 4 hours.
    const totalDays = 8 * 365 + 21;
    const totalMin = (totalDays * 24 + 4) * 60;
    expect(formatDurationParts(totalMin)).toEqual({
      mode: "yearsDaysHours",
      years: 8,
      days: 21,
      hours: 4,
    });
  });

  it("stays in monthsDaysHours just below the 365-day boundary", () => {
    const totalMin = (364 * 24 + 23) * 60;
    expect(formatDurationParts(totalMin)).toEqual({
      mode: "monthsDaysHours",
      months: 12,
      days: 4,
      hours: 23,
    });
  });
});

describe("formatDurationLabel", () => {
  // A stand-in translator that mirrors the tr.json catalog's interpolation shape,
  // so tests exercise the actual key-selection + arg-passing logic without i18next.
  // Cast: TFunction's real signature is a complex overload set; a 2-arg stand-in
  // covers every call formatDurationLabel actually makes.
  const fakeT = ((key: string, options: Record<string, number>) =>
    `${key}:${Object.entries(options)
      .map(([k, v]) => `${k}=${v}`)
      .join(",")}`) as unknown as TFunction;

  it("selects stats.duration.yearsDaysHours for the years tier", () => {
    const parts = formatDurationParts(8 * 365 * 24 * 60 + 21 * 24 * 60 + 4 * 60);
    expect(formatDurationLabel(parts, fakeT)).toBe(
      "stats.duration.yearsDaysHours:years=8,days=21,hours=4",
    );
  });

  it("selects stats.duration.monthsDaysHours for the months tier", () => {
    const parts = formatDurationParts(30 * 24 * 60);
    expect(formatDurationLabel(parts, fakeT)).toBe(
      "stats.duration.monthsDaysHours:months=1,days=0,hours=0",
    );
  });

  it("selects stats.duration.daysHours for the days tier", () => {
    const parts = formatDurationParts(24 * 60);
    expect(formatDurationLabel(parts, fakeT)).toBe("stats.duration.daysHours:days=1,hours=0");
  });

  it("selects stats.duration.hoursMinutes under a full day", () => {
    const parts = formatDurationParts(90);
    expect(formatDurationLabel(parts, fakeT)).toBe(
      "stats.duration.hoursMinutes:hours=1,minutes=30",
    );
  });
});
