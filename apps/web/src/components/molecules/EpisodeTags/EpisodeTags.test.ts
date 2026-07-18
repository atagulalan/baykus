import { describe, expect, it } from "vitest";
import { computeEpisodeTagKinds, type EpisodeTagsProps } from "./EpisodeTags.tsx";

const TODAY = "2026-07-15";

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
    expect(computeEpisodeTagKinds(baseProps(), TODAY)).toEqual([]);
  });

  it("E25: NEW at exactly today-3d is included (lower boundary)", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2026-07-12" }), TODAY)).toContain("new");
  });

  it("E25: NEW one day older than the 3-day window is excluded", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2026-07-11" }), TODAY)).not.toContain(
      "new",
    );
  });

  it("E25: NEW includes today itself (upper boundary)", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: TODAY }), TODAY)).toContain("new");
  });

  it("E25: NEW is capped at today — a future episode gets UPCOMING instead, not NEW", () => {
    const kinds = computeEpisodeTagKinds(baseProps({ airDate: "2027-01-01" }), TODAY);
    expect(kinds).not.toContain("new");
    expect(kinds).toContain("upcoming");
  });

  it("E25: NEW is absent when airDate is null", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: null }), TODAY)).not.toContain("new");
  });

  it("E25: UPCOMING fires for any future airDate, with no upper bound", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2026-07-16" }), TODAY)).toContain(
      "upcoming",
    );
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2030-01-01" }), TODAY)).toContain(
      "upcoming",
    );
  });

  it("E25: UPCOMING is absent for today or the past", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: TODAY }), TODAY)).not.toContain("upcoming");
    expect(computeEpisodeTagKinds(baseProps({ airDate: "2020-01-01" }), TODAY)).not.toContain(
      "upcoming",
    );
  });

  it("E25: UPCOMING is absent when airDate is null", () => {
    expect(computeEpisodeTagKinds(baseProps({ airDate: null }), TODAY)).not.toContain("upcoming");
  });

  it("E25: NEW and UPCOMING are mutually exclusive", () => {
    for (const airDate of ["2026-07-12", "2026-07-15", "2026-07-16", "2027-01-01"]) {
      const kinds = computeEpisodeTagKinds(baseProps({ airDate }), TODAY);
      expect(kinds.includes("new") && kinds.includes("upcoming")).toBe(false);
    }
  });

  it("E25: PREMIER fires on episodeNumber 1 of any season", () => {
    expect(computeEpisodeTagKinds(baseProps({ s: 3, e: 1 }), TODAY)).toContain("premiere");
    expect(computeEpisodeTagKinds(baseProps({ s: 3, e: 2 }), TODAY)).not.toContain("premiere");
  });

  it("E25: FINALE fires on episodeType finale", () => {
    expect(computeEpisodeTagKinds(baseProps({ episodeType: "finale" }), TODAY)).toContain("finale");
  });

  it("E25/E23: SPECIAL fires on season 0 without an OVA name match", () => {
    const kinds = computeEpisodeTagKinds(
      baseProps({ s: 0, episodeTitle: "Behind the Scenes" }),
      TODAY,
    );
    expect(kinds).toContain("special");
    expect(kinds).not.toContain("ova");
  });

  it("E23: OVA replaces SPECIAL when the episode title matches (case-insensitive)", () => {
    const kinds = computeEpisodeTagKinds(
      baseProps({ s: 0, episodeTitle: "Special OVA: Recap" }),
      TODAY,
    );
    expect(kinds).toContain("ova");
    expect(kinds).not.toContain("special");
  });

  it("E23: OVA also matches via seasonName", () => {
    const kinds = computeEpisodeTagKinds(baseProps({ s: 0, seasonName: "ova collection" }), TODAY);
    expect(kinds).toContain("ova");
    expect(kinds).not.toContain("special");
  });

  it("E25: multiple tags render together, in priority order (new, premiere, finale, special/ova)", () => {
    const kinds = computeEpisodeTagKinds(
      baseProps({ s: 0, e: 1, airDate: "2026-07-14", episodeType: "finale" }),
      TODAY,
    );
    expect(kinds).toEqual(["new", "premiere", "finale", "special"]);
  });

  it("E25: upcoming + premiere + special render together, in priority order", () => {
    const kinds = computeEpisodeTagKinds(
      baseProps({ s: 0, e: 1, airDate: "2026-07-20", episodeType: null }),
      TODAY,
    );
    expect(kinds).toEqual(["upcoming", "premiere", "special"]);
  });
});
