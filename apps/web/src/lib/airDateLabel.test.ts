import { describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  daysUntilAir,
  dayUnitLabel,
  formatAirDateLabel,
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

describe("dayUnitLabel", () => {
  it("returns the localized unit word", () => {
    expect(dayUnitLabel(1, "tr")).toBe("gün");
    expect(dayUnitLabel(9, "tr")).toBe("gün");
    expect(dayUnitLabel(1, "en")).toBe("day");
    expect(dayUnitLabel(9, "en")).toBe("days");
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
