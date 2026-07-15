import { describe, expect, it } from "vitest";
import { sortSeasonsSpecialsLast } from "./seasons.ts";

describe("sortSeasonsSpecialsLast (E37)", () => {
  it("sorts numbered seasons ascending", () => {
    const seasons = [{ number: 3 }, { number: 1 }, { number: 2 }];
    expect(sortSeasonsSpecialsLast(seasons).map((s) => s.number)).toEqual([1, 2, 3]);
  });

  it("moves season 0 (Specials) to the end", () => {
    const seasons = [{ number: 0 }, { number: 1 }, { number: 2 }];
    expect(sortSeasonsSpecialsLast(seasons).map((s) => s.number)).toEqual([1, 2, 0]);
  });

  it("keeps Specials last even when it's already last in the input", () => {
    const seasons = [{ number: 1 }, { number: 2 }, { number: 0 }];
    expect(sortSeasonsSpecialsLast(seasons).map((s) => s.number)).toEqual([1, 2, 0]);
  });

  it("does not mutate the input array", () => {
    const seasons = [{ number: 2 }, { number: 1 }];
    const original = [...seasons];
    sortSeasonsSpecialsLast(seasons);
    expect(seasons).toEqual(original);
  });
});
