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
      {
        tvdbId: 371572,
        name: "House of the Dragon",
        followedAt: "2022-08-21T10:00:00.000Z",
        status: "watching",
      },
      { tvdbId: 305288, name: "Dark", followedAt: "2020-06-27T14:00:00.000Z", status: "watching" },
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

  it("resolves name-keyed watch rows (current real TV Time export shape, no tv_show_id) via the shows list, including season/episode numbers", () => {
    const followed = readFixture("followed_tv_show.csv");
    const source = readFixture("seen_episode_source.csv");

    const result = parseTvTimeFiles([source, followed]);

    expect(result.watches).toContainEqual({
      tvdbShowId: 371572,
      tvdbEpisodeId: 8370141,
      watchedAt: "2022-09-05T20:10:00.000Z",
      seasonNumber: 1,
      episodeNumber: 3,
    });
  });

  it("drops a name-keyed watch row silently when its show name isn't in the followed-shows list", () => {
    const source =
      "tv_show_name,episode_season_number,episode_number,episode_id,created_at\n" +
      "Some Unfollowed Show,1,1,999,2020-01-01 00:00:00\n";
    const result = parseTvTimeFiles([source]);
    expect(result.watches).toEqual([]);
  });

  it("resolves name-keyed rows regardless of file order in the zip", () => {
    const followed = "tv_show_id,tv_show_name,created_at\n1,Show A,2020-01-01 00:00:00\n";
    const source =
      "tv_show_name,episode_season_number,episode_number,episode_id,created_at\n" +
      "Show A,2,5,42,2020-02-01 00:00:00\n";
    const result = parseTvTimeFiles([source, followed]);
    expect(result.watches).toEqual([
      {
        tvdbShowId: 1,
        tvdbEpisodeId: 42,
        watchedAt: "2020-02-01T00:00:00.000Z",
        seasonNumber: 2,
        episodeNumber: 5,
      },
    ]);
  });

  it("prefers live followed_tv_show fingerprint over junk GDPR files that share tv_show_id+tv_show_name", () => {
    const followed =
      "notification_offset,tv_show_name,active,diffusion,folder_id,archived,notification_type,user_id,tv_show_id,created_at,updated_at\n" +
      "-10,Real Show,1,original,,0,2,1,100,2020-01-01 00:00:00,2020-01-01 00:00:00\n";
    const addiction =
      "tv_show_name,user_id,tv_show_id,last_action_timestamp,daily_score,weekly_score,monthly_score\n" +
      "Junk Show,1,999,2020-01-01,1,1,1\n";
    const result = parseTvTimeFiles([addiction, followed]);
    expect(result.shows).toEqual([
      {
        tvdbId: 100,
        name: "Real Show",
        followedAt: "2020-01-01T00:00:00.000Z",
        status: "watching",
      },
    ]);
  });

  it("dedupes shows by tvdbId when the same followed show appears twice", () => {
    const a = "tv_show_id,tv_show_name,created_at\n1,Show A,2020-01-01 00:00:00\n";
    const b = "tv_show_id,tv_show_name,created_at\n1,Show A Again,2020-01-02 00:00:00\n";
    const result = parseTvTimeFiles([a, b]);
    expect(result.shows).toEqual([
      { tvdbId: 1, name: "Show A", followedAt: "2020-01-01T00:00:00.000Z", status: "watching" },
    ]);
  });

  it("ignores episode-shaped non-watch files (emotion / character vote / comment reads)", () => {
    const followed = "tv_show_id,tv_show_name,created_at\n1,Show A,2020-01-01 00:00:00\n";
    const emotion =
      "updated_at,tv_show_name,episode_season_number,episode_number,user_id,episode_id,emotion_id,created_at\n" +
      "2020-01-02 00:00:00,Show A,1,1,1,42,7,2020-01-02 00:00:00\n";
    const result = parseTvTimeFiles([followed, emotion]);
    expect(result.watches).toEqual([]);
  });

  it("ignores episode_comment.csv (real-export header shape) — comment rows are not watches", () => {
    const followed = "tv_show_id,tv_show_name,created_at\n1,Show A,2020-01-01 00:00:00\n";
    const episodeComment =
      "comment,created_at,episode_season_number,episode_number,id,episode_id,comment_type,parent_comment_id,tv_show_name\n" +
      "Great episode!,2020-01-02 00:00:00,1,1,55,42,reply,,Show A\n";
    const result = parseTvTimeFiles([followed, episodeComment]);
    expect(result.watches).toEqual([]);
  });

  it("ignores watched_on_episode.csv (real-export header shape) — watch-platform metadata is not a watch event", () => {
    const followed = "tv_show_id,tv_show_name,created_at\n1,Show A,2020-01-01 00:00:00\n";
    const watchedOn =
      "tv_show_name,episode_season_number,episode_number,episode_id,watched_on_source_id,created_at\n" +
      "Show A,1,1,42,3,2020-01-02 00:00:00\n";
    const result = parseTvTimeFiles([followed, watchedOn]);
    expect(result.watches).toEqual([]);
  });

  it("parses trackingV1 format (tracking-prod-records.csv) correctly, ignoring non-watch types", () => {
    const v1 =
      "updated_at,created_at,type,series_id,episode_id,season_number,episode_number,series_name\n" +
      "2021-06-11 22:52:14,2018-03-05 07:49:20,watch,80348,349302,1,13,Chuck\n" +
      "2021-06-11 22:52:14,2017-06-21 07:38:29,last-episode-watched,80348,349302,1,13,Chuck\n";
    const result = parseTvTimeFiles([v1]);

    expect(result.watches).toEqual([
      {
        tvdbShowId: 80348,
        tvdbEpisodeId: 349302,
        watchedAt: "2018-03-05T07:49:20.000Z",
        seasonNumber: 1,
        episodeNumber: 13,
      },
    ]);
  });

  it("parses trackingV2 format (tracking-prod-records-v2.csv) correctly, ignoring non-watch keys", () => {
    const v2 =
      "created_at,s_id,ep_id,key,s_no,ep_no,series_name\n" +
      "2023-09-28 10:27:37,420657,9687661,watch-episode-123456,1,12,KonoSuba: An Explosion on This Wonderful World!\n" +
      "2023-09-28 10:27:37,420657,9687661,something-else-123456,1,12,KonoSuba: An Explosion on This Wonderful World!\n";
    const result = parseTvTimeFiles([v2]);

    expect(result.watches).toEqual([
      {
        tvdbShowId: 420657,
        tvdbEpisodeId: 9687661,
        watchedAt: "2023-09-28T10:27:37.000Z",
        seasonNumber: 1,
        episodeNumber: 12,
      },
    ]);
  });

  it("collapses the same (show, episode) watch seen in two files within 60s into one watch", () => {
    const v1 = "created_at,type,series_id,episode_id\n2021-06-11 22:52:00,watch,80348,349302\n";
    const v2 = "created_at,s_id,ep_id,key\n2021-06-11 22:52:30,80348,349302,watch-episode-1\n";
    const result = parseTvTimeFiles([v1, v2]);
    expect(result.watches).toEqual([
      { tvdbShowId: 80348, tvdbEpisodeId: 349302, watchedAt: "2021-06-11T22:52:00.000Z" },
    ]);
  });

  it("keeps the same (show, episode) watch as two events when timestamps are 2 days apart (genuine rewatch)", () => {
    const v1 =
      "created_at,type,series_id,episode_id\n" +
      "2021-06-11 22:52:00,watch,80348,349302\n" +
      "2021-06-13 22:52:00,watch,80348,349302\n";
    const result = parseTvTimeFiles([v1]);
    expect(result.watches).toEqual([
      { tvdbShowId: 80348, tvdbEpisodeId: 349302, watchedAt: "2021-06-11T22:52:00.000Z" },
      { tvdbShowId: 80348, tvdbEpisodeId: 349302, watchedAt: "2021-06-13T22:52:00.000Z" },
    ]);
  });

  it("resolves show tracking status based on active/archived fields and user_show_special_status.csv (specialStatus)", () => {
    const followed =
      "notification_offset,tv_show_name,active,diffusion,folder_id,archived,notification_type,user_id,tv_show_id,created_at,updated_at\n" +
      "-10,Show A,1,original,,0,2,1,101,2020-01-01 00:00:00,2020-01-01 00:00:00\n" +
      "-10,Show B,0,original,,0,2,1,102,2020-01-01 00:00:00,2020-01-01 00:00:00\n" +
      "-10,Show C,1,original,,1,2,1,103,2020-01-01 00:00:00,2020-01-01 00:00:00\n" +
      "-10,Show D,1,original,,0,2,1,104,2020-01-01 00:00:00,2020-01-01 00:00:00\n";

    const special =
      "user_id,tv_show_id,status,created_at,updated_at,tv_show_name\n" +
      "1,104,for_later,2020-01-01 00:00:00,2020-01-01 00:00:00,Show D\n";

    const result = parseTvTimeFiles([followed, special]);

    expect(result.shows).toEqual([
      { tvdbId: 101, name: "Show A", followedAt: "2020-01-01T00:00:00.000Z", status: "watching" },
      { tvdbId: 102, name: "Show B", followedAt: "2020-01-01T00:00:00.000Z", status: "dropped" },
      { tvdbId: 103, name: "Show C", followedAt: "2020-01-01T00:00:00.000Z", status: "paused" },
      {
        tvdbId: 104,
        name: "Show D",
        followedAt: "2020-01-01T00:00:00.000Z",
        status: "plan_to_watch",
      },
    ]);
  });
});
