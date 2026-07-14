import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvRecords } from "./csv.ts";

const fixturesDir = fileURLToPath(new URL("../../../fixtures/tvtime", import.meta.url));

function readFixture(name: string): string {
  return readFileSync(`${fixturesDir}/${name}`, "utf-8");
}

describe("parseCsv", () => {
  it("splits simple comma-separated rows", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with embedded commas and escaped quotes", () => {
    const rows = parseCsv('name,note\n"Grey\'s, Anatomy","She said ""hi"""\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Grey's, Anatomy", 'She said "hi"'],
    ]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignores a trailing blank line", () => {
    const rows = parseCsv("a,b\n1,2\n\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvRecords", () => {
  it("keys each row by the header row", () => {
    const records = parseCsvRecords("id,name\n1,Dark\n2,House of the Dragon\n");
    expect(records).toEqual([
      { id: "1", name: "Dark" },
      { id: "2", name: "House of the Dragon" },
    ]);
  });

  it("parses the real followed_tv_show.csv fixture", () => {
    const records = parseCsvRecords(readFixture("followed_tv_show.csv"));
    expect(records).toEqual([
      {
        tv_show_id: "371572",
        tv_show_name: "House of the Dragon",
        created_at: "2022-08-21 10:00:00",
      },
      { tv_show_id: "305288", tv_show_name: "Dark", created_at: "2020-06-27 14:00:00" },
    ]);
  });

  it("parses the real seen_episode.csv fixture", () => {
    const records = parseCsvRecords(readFixture("seen_episode.csv"));
    expect(records).toHaveLength(4);
    expect(records[0]).toEqual({
      tv_show_id: "371572",
      episode_id: "8370139",
      created_at: "2022-08-22 05:12:33",
      updated_at: "2022-08-22 05:12:33",
    });
  });
});
