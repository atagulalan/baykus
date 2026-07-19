import { describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  daysUntilAir,
  formatAirDateLabel,
  unairedTrailingState,
} from "./airDateLabel.ts";

describe("calendarDaysBetween", () => {
  it("counts signed whole days", () => {
    expect(calendarDaysBetween("2026-07-18", "2026-07-18")).toBe(0);
    expect(calendarDaysBetween("2026-07-18", "2026-07-19")).toBe(1);
    expect(calendarDaysBetween("2026-07-18", "2026-07-17")).toBe(-1);
    expect(calendarDaysBetween("2026-07-18", "2026-07-11")).toBe(-7);
  });
});

describe("daysUntilAir", () => {
  const today = "2026-07-18";

  it("returns null for null, today, and past air dates", () => {
    expect(daysUntilAir(null, today)).toBeNull();
    expect(daysUntilAir("2026-07-18", today)).toBeNull();
    expect(daysUntilAir("2026-07-17", today)).toBeNull();
  });

  it("returns whole days until a future air date", () => {
    expect(daysUntilAir("2026-07-19", today)).toBe(1);
    expect(daysUntilAir("2026-07-27", today)).toBe(9);
  });
});

describe("unairedTrailingState", () => {
  const today = "2026-07-18";

  it("returns tbd for null airDate", () => {
    expect(unairedTrailingState(null, today)).toEqual({ kind: "tbd" });
  });

  it("returns countdown for future airDate", () => {
    expect(
      unairedTrailingState(
        "2026-07-27",
        today,
        undefined,
        new Date(`${today}T00:00:00Z`).getTime(),
      ),
    ).toEqual({ kind: "countdown", days: 9 });
  });

  it("returns none for today and past airDate", () => {
    expect(unairedTrailingState("2026-07-18", today)).toEqual({ kind: "none" });
    expect(unairedTrailingState("2026-07-17", today)).toEqual({ kind: "none" });
  });

  it("shows seconds when under one minute remains", () => {
    const airStamp = "2026-07-19T00:01:00Z";
    const now = new Date("2026-07-19T00:00:30Z").getTime();
    expect(unairedTrailingState("2026-07-19", today, airStamp, now)).toEqual({
      kind: "countdownSeconds",
      seconds: 30,
    });
  });

  it("shows minutes once at least one minute remains", () => {
    const airStamp = "2026-07-19T00:01:00Z";
    const now = new Date("2026-07-19T00:00:00Z").getTime();
    expect(unairedTrailingState("2026-07-19", today, airStamp, now)).toEqual({
      kind: "countdownMinutes",
      minutes: 1,
    });
  });

  it("rounds the clock bucket up to whole hours (no H:MM)", () => {
    // 13h38m out → ceil to 14, rendered as a single "14 hrs" mark, not "13:38".
    const airStamp = "2026-07-19T00:38:00Z";
    const now = new Date("2026-07-18T11:00:00Z").getTime();
    expect(unairedTrailingState("2026-07-19", today, airStamp, now)).toEqual({
      kind: "countdownClock",
      hours: 14,
    });
  });

  it("keeps exact hours exact in the clock bucket", () => {
    const airStamp = "2026-07-19T00:00:00Z";
    const now = new Date("2026-07-18T22:00:00Z").getTime();
    expect(unairedTrailingState("2026-07-19", today, airStamp, now)).toEqual({
      kind: "countdownClock",
      hours: 2,
    });
  });
});

describe("formatAirDateLabel", () => {
  const today = "2026-07-18";

  it("uses relative labels for near dates (tr)", () => {
    expect(formatAirDateLabel("2026-07-19", "tr", { today })).toBe("Yarın");
    expect(formatAirDateLabel("2026-07-18", "tr", { today })).toBe("Bugün");
    expect(formatAirDateLabel("2026-07-17", "tr", { today })).toBe("Dün");
    expect(formatAirDateLabel("2026-07-12", "tr", { today })).toBe("Geçen hafta");
    expect(formatAirDateLabel("2026-07-11", "tr", { today })).toBe("Geçen hafta");
  });

  it("uses relative labels for near dates (en)", () => {
    expect(formatAirDateLabel("2026-07-19", "en", { today })).toBe("Tomorrow");
    expect(formatAirDateLabel("2026-07-18", "en", { today })).toBe("Today");
    expect(formatAirDateLabel("2026-07-17", "en", { today })).toBe("Yesterday");
    expect(formatAirDateLabel("2026-07-12", "en", { today })).toBe("Last week");
  });

  it("falls back to a long absolute date outside the near window", () => {
    expect(formatAirDateLabel("2024-09-12", "tr", { today })).toMatch(/12.*Eylül.*2024/);
    expect(formatAirDateLabel("2026-07-20", "tr", { today })).toMatch(/20.*Temmuz.*2026/);
    expect(formatAirDateLabel("2026-07-10", "tr", { today })).toMatch(/10.*Temmuz.*2026/);
  });

  it("skips relative labels when isAbsoluteDate is true", () => {
    expect(formatAirDateLabel("2026-07-18", "tr", { today, isAbsoluteDate: true })).toMatch(
      /18.*Temmuz.*2026/,
    );
    expect(formatAirDateLabel("2026-07-19", "en", { today, isAbsoluteDate: true })).toMatch(
      /July 19, 2026/,
    );
  });
});
