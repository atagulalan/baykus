import { createInstance, type i18n } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import {
  countdownDayUnit,
  countdownHourUnit,
  countdownMinuteUnit,
  countdownSecondUnit,
} from "./countdownUnit.ts";

let t: i18n["t"];

beforeAll(async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: "tr",
    resources: {
      tr: {
        translation: {
          episode: {
            countdownUnit: {
              day_one: "gün",
              day_other: "gün",
              hour_one: "sa",
              hour_other: "sa",
              minute: "dk",
              second: "sn",
            },
          },
        },
      },
      en: {
        translation: {
          episode: {
            countdownUnit: {
              day_one: "day",
              day_other: "days",
              hour_one: "hr",
              hour_other: "hrs",
              minute: "mins",
              second: "secs",
            },
          },
        },
      },
    },
  });
  t = i18n.t.bind(i18n);
  (globalThis as { __countdownUnitI18n?: typeof i18n }).__countdownUnitI18n = i18n;
});

async function useLanguage(lng: "tr" | "en") {
  const i18n = (globalThis as { __countdownUnitI18n?: i18n }).__countdownUnitI18n;
  if (!i18n) throw new Error("i18n not initialized");
  await i18n.changeLanguage(lng);
  t = i18n.t.bind(i18n);
}

describe("countdownUnit", () => {
  it("returns Turkish compact units", async () => {
    await useLanguage("tr");
    expect(countdownDayUnit(9, t)).toBe("gün");
    expect(countdownHourUnit(2, t)).toBe("sa");
    expect(countdownMinuteUnit(t)).toBe("dk");
    expect(countdownSecondUnit(t)).toBe("sn");
  });

  it("returns English compact units with plural day/hour forms", async () => {
    await useLanguage("en");
    expect(countdownDayUnit(1, t)).toBe("day");
    expect(countdownDayUnit(9, t)).toBe("days");
    expect(countdownHourUnit(1, t)).toBe("hr");
    expect(countdownHourUnit(2, t)).toBe("hrs");
    expect(countdownMinuteUnit(t)).toBe("mins");
    expect(countdownSecondUnit(t)).toBe("secs");
  });
});
