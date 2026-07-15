import { describe, expect, it } from "vitest";
import { computeEpisodeTagKinds, type EpisodeTagsProps } from "./EpisodeTags.tsx";

const NOW = new Date("2026-07-15T12:00:00Z");

function baseProps(overrides: Partial<EpisodeTagsProps> = {}): EpisodeTagsProps {
  return {
    s: 1,
    e: 5,
    airDate: "2020-01-01",
    episodeType: null,
    episodeTitle: null,
    seasonName: null,
    ...overrides,
  };
}

describe("computeEpisodeTagKinds", () => {
  it("returns no tags for a plain old, non-special, non-premiere episode", () => {
    expect(computeEpisodeTagKinds(baseProps(), NOW)).toEqual([]);
  });

  it("E25: NEW at exactly today-3d is included (lower boundary)", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2026-07-12" }), NOW)).toContain("new");
  });

  it("E25: NEW one day older than the 3-day window is excluded", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2026-07-11" }), NOW)).not.toContain("new");
  });

  it("E25: NEW has no upper bound — a far-future scheduled episode still counts", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2027-01-01" }), NOW)).toContain("new");
  });

  it("E25: NEW is absent when airDate is null", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: null }), NOW)).not.toContain("new");
  });

  it("E25: PREMIER fires on episodeNumber 1 of any season", () => {
    expect(computeEpisodeTagKinds(baseProps({ s: 3, e: 1 }), NOW)).toContain("premiere");
    expect(computeEpisodeTagKinds(baseProps({ s: 3, e: 2 }), NOW)).not.toContain("premiere");
  });

  it("E25: FINALE fires on episodeType finale", () => {
    expect(computeEpisodeTagKinds(baseProps({ episodeType: "finale" }), NOW)).toContain("finale");
  });

  it("E25/E23: SPECIAL fires on season 0 without an OVA name match", () => {
    const kinds = computeEpisodeTagKinds(
      baseProps({ s: 0, episodeTitle: "Behind the Scenes" }),
      NOW,
    );
    expect(kinds).toContain("special");
    expect(kinds).not.toContain("ova");
  });

  it("E23: OVA replaces SPECIAL when the episode title matches (case-insensitive)", () => {
    const kinds = computeEpisodeTagKinds(
      baseProps({ s: 0, episodeTitle: "Special OVA: Recap" }),
      NOW,
    );
    expect(kinds).toContain("ova");
    expect(kinds).not.toContain("special");
  });

  it("E23: OVA also matches via seasonName", () => {
    const kinds = computeEpisodeTagKinds(baseProps({ s: 0, seasonName: "ova collection" }), NOW);
    expect(kinds).toContain("ova");
    expect(kinds).not.toContain("special");
  });

  it("E25: multiple tags render together, in priority order (new, premiere, finale, special/ova)", () => {
    const kinds = computeEpisodeTagKinds(
      baseProps({ s: 0, e: 1, airDate: "2026-07-14", episodeType: "finale" }),
      NOW,
    );
    expect(kinds).toEqual(["new", "premiere", "finale", "special"]);
  });
});
