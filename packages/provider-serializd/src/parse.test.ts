import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractNextData, mapExternalRatings, mapTags, parseShowData } from "./parse.ts";

const fixturePath = fileURLToPath(
  new URL("../../../fixtures/serializd/show-94997-next-data.json", import.meta.url),
);
const fixtureJson = readFileSync(fixturePath, "utf-8");

function htmlWrapping(json: string): string {
  return `<!doctype html><html><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json">${json}</script></body></html>`;
}

describe("extractNextData", () => {
  it("extracts and parses the JSON payload from a real captured page", () => {
    const data = extractNextData(htmlWrapping(fixtureJson));
    expect(data).toEqual(JSON.parse(fixtureJson));
  });

  it("throws PARSE_FAILED when the script tag is missing", () => {
    expect(() => extractNextData("<html><body>no data here</body></html>")).toThrowError(
      expect.objectContaining({ code: "PARSE_FAILED" }),
    );
  });

  it("throws PARSE_FAILED when the script tag contains malformed JSON", () => {
    expect(() =>
      extractNextData(
        '<script id="__NEXT_DATA__" type="application/json">{not valid json</script>',
      ),
    ).toThrowError(expect.objectContaining({ code: "PARSE_FAILED" }));
  });
});

describe("parseShowData", () => {
  it("validates and extracts the real fixture's show data", () => {
    const nextData = JSON.parse(fixtureJson);
    const data = parseShowData(nextData);
    expect(data.showDetails.id).toBe(94997);
    expect(data.showDetails.name).toBe("House of the Dragon");
    expect(data.averageRating).toBe(7.88);
    expect(data.ratings).toHaveLength(10);
    expect(data.nanogenres.length).toBeGreaterThan(0);
  });

  it("throws PARSE_FAILED on shape drift (missing showDetails)", () => {
    expect(() => parseShowData({ props: { pageProps: { data: {} } } })).toThrowError(
      expect.objectContaining({ code: "PARSE_FAILED" }),
    );
  });

  it("throws PARSE_FAILED when props.pageProps.data is missing entirely", () => {
    expect(() => parseShowData({ props: {} })).toThrowError(
      expect.objectContaining({ code: "PARSE_FAILED" }),
    );
  });
});

describe("mapExternalRatings", () => {
  it("maps the real fixture's rating + full distribution on a 10 scale", () => {
    const data = parseShowData(JSON.parse(fixtureJson));
    const ratings = mapExternalRatings(data);

    expect(ratings).toHaveLength(1);
    const rating = ratings[0];
    expect(rating).toMatchObject({ source: "serializd", value: 7.88, scale: 10 });
    expect(rating?.distribution?.["10"]).toBe(7094);
    expect(rating?.distribution?.["1"]).toBe(179);
    expect(rating?.votes).toBe(179 + 231 + 430 + 568 + 2244 + 3457 + 9790 + 12042 + 10789 + 7094);
  });

  it("returns [] when averageRating is null", () => {
    const ratings = mapExternalRatings({
      showDetails: { id: 1, name: "x" },
      averageRating: null,
      ratings: [],
      nanogenres: [],
    });
    expect(ratings).toEqual([]);
  });
});

describe("mapTags", () => {
  it("maps nanogenres to TagInfo without an imageRef", () => {
    const data = parseShowData(JSON.parse(fixtureJson));
    const tags = mapTags(data);

    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag.source).toBe("serializd");
      expect(tag.imageRef).toBeUndefined();
    }
    expect(tags.map((t) => t.name)).toContain("🏛️ Politics");
  });
});
