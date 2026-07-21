import { describe, expect, it } from "vitest";
import { buildScheduleGridModel, type ScheduleGridDayInput } from "./buildScheduleModel.ts";
import { getAbsoluteWeek } from "./weeks.ts";

const TODAY = "2026-07-21"; // Tuesday

function ep(
  partial: Partial<ScheduleGridDayInput["entries"][number]> & {
    episodeId: number;
    itemId: number;
    airDate: string;
  },
): ScheduleGridDayInput["entries"][number] {
  return {
    title: "Show",
    posterRef: null,
    s: 1,
    e: 1,
    episodeTitle: null,
    airStamp: null,
    isWatched: false,
    ...partial,
  };
}

describe("buildScheduleGridModel", () => {
  it("marks the current absolute week and labels weekdays Mon-first", () => {
    const model = buildScheduleGridModel([], { today: TODAY, locale: "en-US" });
    expect(model.currentAbsWeek).toBe(getAbsoluteWeek(TODAY));
    expect(model.weekdayLabels).toHaveLength(7);
    const current = model.columns.find(
      (c) => c.type === "week" && c.absWeek === model.currentAbsWeek,
    );
    expect(current?.type).toBe("week");
    if (current?.type === "week") expect(current.isCurrent).toBe(true);
  });

  it("drops fully-watched strips and keeps mixed/unwatched cells", () => {
    const days: ScheduleGridDayInput[] = [
      {
        date: TODAY,
        entries: [
          ep({ episodeId: 1, itemId: 10, airDate: TODAY, isWatched: true, e: 1 }),
          ep({ episodeId: 2, itemId: 10, airDate: TODAY, isWatched: true, e: 2 }),
        ],
      },
      {
        date: "2026-07-22",
        entries: [
          ep({
            episodeId: 3,
            itemId: 20,
            airDate: "2026-07-22",
            isWatched: false,
            title: "Live",
            e: 1,
          }),
        ],
      },
    ];
    const model = buildScheduleGridModel(days, { today: TODAY, locale: "en-US" });
    const week = model.columns.find(
      (c) => c.type === "week" && c.absWeek === getAbsoluteWeek(TODAY),
    );
    expect(week?.type).toBe("week");
    if (week?.type !== "week") return;
    // Tuesday = dow 1 (Mon=0); fully watched Tue strip omitted
    expect(week.byDow[1] ?? []).toEqual([]);
    // Wednesday = dow 2
    expect((week.byDow[2] ?? []).map((e) => e.episodeId)).toEqual([3]);
  });

  it("compresses 4+ inactive weeks into a gap column", () => {
    const far = "2026-09-14"; // ~8 weeks later, Monday
    const days: ScheduleGridDayInput[] = [
      {
        date: far,
        entries: [ep({ episodeId: 9, itemId: 1, airDate: far, isWatched: false })],
      },
    ];
    const model = buildScheduleGridModel(days, { today: TODAY, locale: "en-US" });
    expect(model.columns.some((c) => c.type === "gap")).toBe(true);
  });
});
