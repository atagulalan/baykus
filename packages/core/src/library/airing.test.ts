import { describe, expect, it } from "vitest";
import {
  airInstantIso,
  episodeNewlyAiredSince,
  isEpisodeAired,
  normalizeAirStamp,
} from "./airing.ts";

describe("airing", () => {
  const beforeRickMorty909 = new Date("2026-07-20T02:59:59Z");
  const afterRickMorty909 = new Date("2026-07-20T03:00:00Z");

  it("uses airStamp for minute-accurate airedness", () => {
    const ep = {
      airDate: "2026-07-19",
      airStamp: "2026-07-20T03:00:00Z",
    };
    expect(isEpisodeAired(ep, beforeRickMorty909)).toBe(false);
    expect(isEpisodeAired(ep, afterRickMorty909)).toBe(true);
  });

  it("falls back to UTC midnight of airDate when airStamp is absent", () => {
    const ep = { airDate: "2026-07-19", airStamp: null };
    expect(isEpisodeAired(ep, new Date("2026-07-18T23:59:59Z"))).toBe(false);
    expect(isEpisodeAired(ep, new Date("2026-07-19T00:00:00Z"))).toBe(true);
  });

  it("normalizes offset stamps to Z", () => {
    expect(normalizeAirStamp("2026-07-20T03:00:00+00:00")).toBe("2026-07-20T03:00:00Z");
  });

  it("detects newly aired episodes against a refresh timestamp", () => {
    const ep = {
      airDate: "2026-07-19",
      airStamp: "2026-07-20T03:00:00Z",
    };
    expect(episodeNewlyAiredSince(ep, "2026-07-19T12:00:00Z", afterRickMorty909)).toBe(true);
    expect(episodeNewlyAiredSince(ep, "2026-07-20T03:00:00Z", afterRickMorty909)).toBe(false);
  });

  it("airInstantIso prefers stamp over date", () => {
    expect(airInstantIso({ airDate: "2026-07-19", airStamp: "2026-07-20T03:00:00Z" })).toBe(
      "2026-07-20T03:00:00Z",
    );
  });
});
