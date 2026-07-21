import { describe, expect, it } from "vitest";
import { computeEpisodeTagKinds } from "./episodeTags.ts";

describe("computeEpisodeTagKinds (E25/E23)", () => {
  it("marks premiere + new for S1E1 aired today", () => {
    expect(
      computeEpisodeTagKinds(
        {
          s: 1,
          e: 1,
          airDate: "2024-07-21",
          airStamp: "2024-07-21T00:00:00Z",
          episodeType: "standard",
        },
        "2024-07-21",
      ),
    ).toEqual(["new", "premiere"]);
  });

  it("marks upcoming for future air date", () => {
    expect(
      computeEpisodeTagKinds(
        {
          s: 2,
          e: 3,
          airDate: "2024-08-01",
          airStamp: "2024-08-01T00:00:00Z",
          episodeType: null,
        },
        "2024-07-21",
      ),
    ).toEqual(["upcoming"]);
  });

  it("marks ova for special season 0 with OVA in title", () => {
    expect(
      computeEpisodeTagKinds(
        {
          s: 0,
          e: 1,
          airDate: "2020-01-01",
          airStamp: "2020-01-01T00:00:00Z",
          episodeType: null,
          episodeTitle: "OVA Special",
        },
        "2024-07-21",
      ),
    ).toContain("ova");
  });
});
