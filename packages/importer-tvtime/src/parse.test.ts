import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTvTimeFiles } from "./parse.ts";

const fixturesDir = fileURLToPath(new URL("../../../fixtures/tvtime", import.meta.url));

function readFixture(name: string): string {
  return readFileSync(`${fixturesDir}/${name}`, "utf-8");
}

describe("parseTvTimeFiles", () => {
  it("detects file kind by header, not filename, and parses the real fixtures", () => {
    const followed = readFixture("followed_tv_show.csv");
    const seen = readFixture("seen_episode.csv");

    // shuffled order + renamed inputs to prove header-based detection
    const result = parseTvTimeFiles([seen, followed]);

    expect(result.shows).toEqual([
      { tvdbId: 371572, name: "House of the Dragon", followedAt: "2022-08-21T10:00:00.000Z" },
      { tvdbId: 305288, name: "Dark", followedAt: "2020-06-27T14:00:00.000Z" },
    ]);

    expect(result.watches).toHaveLength(4);
    expect(result.watches[0]).toEqual({
      tvdbShowId: 371572,
      tvdbEpisodeId: 8370139,
      watchedAt: "2022-08-22T05:12:33.000Z",
    });
  });

  it("skips unrecognized files silently", () => {
    const result = parseTvTimeFiles(["not,a,tvtime,file\nfoo,bar,baz,qux\n"]);
    expect(result).toEqual({ shows: [], watches: [] });
  });

  it("ignores rows with a non-numeric show id", () => {
    const result = parseTvTimeFiles([
      "tv_show_id,tv_show_name,created_at\nabc,Some Show,2020-01-01 00:00:00\n",
    ]);
    expect(result.shows).toEqual([]);
  });

  it("accumulates shows/watches across multiple files of the same kind", () => {
    const a = "tv_show_id,tv_show_name,created_at\n1,Show A,2020-01-01 00:00:00\n";
    const b = "tv_show_id,tv_show_name,created_at\n2,Show B,2020-01-02 00:00:00\n";
    const result = parseTvTimeFiles([a, b]);
    expect(result.shows.map((s) => s.name)).toEqual(["Show A", "Show B"]);
  });
});
