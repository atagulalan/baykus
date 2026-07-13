import Database from "better-sqlite3";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "./schema.ts";

describe("library schema", () => {
  it("items has every contract column", () => {
    const cols = Object.keys(getTableColumns(schema.items));
    for (const col of [
      "id",
      "mediaType",
      "title",
      "originalTitle",
      "tagline",
      "overview",
      "posterRef",
      "backdropRef",
      "logoRef",
      "releaseStatus",
      "firstAirDate",
      "lastAirDate",
      "originCountry",
      "originalLanguage",
      "episodeRunTimes",
      "networks",
      "genres",
      "tags",
      "contentRatings",
      "tmdbId",
      "tvmazeId",
      "imdbId",
      "tvdbId",
      "watchProviders",
      "externalRatings",
      "lastRefreshedAt",
      "addedAt",
    ]) {
      expect(cols, `missing items.${col}`).toContain(col);
    }
  });

  it("episodes/watches/ratings carry the tracking-critical columns", () => {
    expect(Object.keys(getTableColumns(schema.episodes))).toEqual(
      expect.arrayContaining(["seasonNumber", "episodeNumber", "airDate", "episodeType"]),
    );
    expect(Object.keys(getTableColumns(schema.watches))).toEqual(
      expect.arrayContaining(["episodeId", "watchedAt", "source"]),
    );
    expect(Object.keys(getTableColumns(schema.ratings))).toEqual(
      expect.arrayContaining(["targetType", "targetId", "value"]),
    );
  });

  it("better-sqlite3 native module loads and runs in-memory", () => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE smoke (id INTEGER PRIMARY KEY, name TEXT)");
    db.prepare("INSERT INTO smoke (name) VALUES (?)").run("baykus");
    const row = db.prepare("SELECT name FROM smoke WHERE id = 1").get() as { name: string };
    expect(row.name).toBe("baykus");
    db.close();
  });
});
