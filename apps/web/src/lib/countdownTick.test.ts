import { describe, expect, it } from "vitest";
import {
  calendarDayTickMs,
  countdownTickMs,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
} from "./countdownTick.ts";

describe("countdownTickMs", () => {
  it("returns null when nothing remains", () => {
    expect(countdownTickMs(null)).toBeNull();
    expect(countdownTickMs(0)).toBeNull();
    expect(countdownTickMs(-1)).toBeNull();
  });

  it("ticks every second in the last minute", () => {
    expect(countdownTickMs(59_999)).toBe(MS_PER_SECOND);
    expect(countdownTickMs(5_000)).toBe(MS_PER_SECOND);
    expect(countdownTickMs(1)).toBe(MS_PER_SECOND);
  });

  it("ticks every minute under one day", () => {
    expect(countdownTickMs(MS_PER_MINUTE)).toBe(MS_PER_MINUTE);
    expect(countdownTickMs(MS_PER_HOUR)).toBe(MS_PER_MINUTE);
    expect(countdownTickMs(MS_PER_DAY - 1)).toBe(MS_PER_MINUTE);
  });

  it("ticks every hour from one day onward", () => {
    expect(countdownTickMs(MS_PER_DAY)).toBe(MS_PER_HOUR);
    expect(countdownTickMs(2 * MS_PER_DAY)).toBe(MS_PER_HOUR);
  });
});

describe("calendarDayTickMs", () => {
  it("returns null for aired or unknown dates", () => {
    const now = new Date("2026-07-19T12:00:00").getTime();
    expect(calendarDayTickMs(null, now)).toBeNull();
    expect(calendarDayTickMs("2026-07-19", now)).toBeNull();
    expect(calendarDayTickMs("2026-07-18", now)).toBeNull();
  });

  it("schedules the next tick at local midnight", () => {
    const now = new Date("2026-07-19T22:30:00").getTime();
    expect(calendarDayTickMs("2026-07-27", now)).toBe(5_400_000);
  });
});
