import { describe, expect, it } from "vitest";
import { isEpisodeAired, msUntilAir } from "./airing.ts";

describe("airing (web mirror)", () => {
  it("uses airStamp for minute-accurate airedness", () => {
    const ep = { airDate: "2026-07-19", airStamp: "2026-07-20T03:00:00Z" };
    expect(isEpisodeAired(ep, new Date("2026-07-20T02:59:59Z"))).toBe(false);
    expect(isEpisodeAired(ep, new Date("2026-07-20T03:00:00Z"))).toBe(true);
  });

  it("msUntilAir returns remaining milliseconds", () => {
    const ep = { airDate: "2026-07-19", airStamp: "2026-07-20T03:00:00Z" };
    expect(msUntilAir(ep, new Date("2026-07-20T02:59:00Z").getTime())).toBe(60_000);
    expect(msUntilAir(ep, new Date("2026-07-20T03:00:00Z").getTime())).toBeNull();
  });
});
