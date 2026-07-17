import { describe, expect, it } from "vitest";
import { formatDurationParts } from "./date.ts";

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
});
