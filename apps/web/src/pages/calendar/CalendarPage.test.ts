import { describe, expect, it } from "vitest";
import type { CalendarDay, CalendarEntry } from "../../api/types.ts";
import { pickUnwatchedPast } from "./CalendarPage.tsx";

// Helper to create a calendar entry
function createEntry(
  itemId: number,
  episodeId: number,
  airDate: string,
  isWatched = false,
): CalendarEntry {
  return {
    itemId,
    title: `Show ${itemId}`,
    posterRef: null,
    episodeId,
    s: 1,
    e: episodeId,
    episodeTitle: `Episode ${episodeId}`,
    episodeType: "standard",
    seasonName: "Season 1",
    airDate,
    airStamp: null,
    network: null,
    watchProviders: [],
    isWatched,
  };
}

describe("pickUnwatchedPast", () => {
  const today = "2026-07-17";

  it("filters out future dates, isWatched, and justWatched entries", () => {
    const days: CalendarDay[] = [
      {
        date: "2026-07-10",
        entries: [
          createEntry(1, 101, "2026-07-10", false), // Keep
          createEntry(2, 102, "2026-07-10", true), // Filter: isWatched = true
        ],
      },
      {
        date: "2026-07-15",
        entries: [
          createEntry(3, 103, "2026-07-15", false), // Filter: in justWatched
        ],
      },
      {
        date: "2026-07-18",
        entries: [
          createEntry(4, 104, "2026-07-18", false), // Filter: future date
        ],
      },
    ];

    const result = pickUnwatchedPast(days, today, new Set([103]));
    expect(result).toHaveLength(1);
    expect(result[0]?.episodeId).toBe(101);
  });

  it("deduplicates by series (itemId), showing the earlier-released episode", () => {
    const days: CalendarDay[] = [
      {
        date: "2026-07-10",
        entries: [
          createEntry(1, 101, "2026-07-10", false), // Keep: Series 1, Ep 1 (earlier)
          createEntry(2, 201, "2026-07-10", false), // Keep: Series 2, Ep 1
        ],
      },
      {
        date: "2026-07-12",
        entries: [
          createEntry(1, 102, "2026-07-12", false), // Filter: Series 1, Ep 2 (later)
        ],
      },
      {
        date: "2026-07-14",
        entries: [
          createEntry(3, 301, "2026-07-14", false), // Keep: Series 3, Ep 1
        ],
      },
    ];

    const result = pickUnwatchedPast(days, today, new Set());

    // We expect:
    // Past unwatched list: [Series 1 Ep 1, Series 2 Ep 1, Series 1 Ep 2, Series 3 Ep 1]
    // After deduplication keeping earliest: [Series 1 Ep 1, Series 2 Ep 1, Series 3 Ep 1]
    // After slice(-3) and reverse (nearest-to-today first):
    // 1. Series 3 Ep 1 (2026-07-14)
    // 2. Series 2 Ep 1 (2026-07-10)
    // 3. Series 1 Ep 1 (2026-07-10)
    expect(result).toHaveLength(3);
    expect(result[0]?.episodeId).toBe(301);
    expect(result[1]?.episodeId).toBe(201);
    expect(result[2]?.episodeId).toBe(101);
  });

  it("respects the TODAY_SUGGEST_LIMIT (3) and orders nearest-to-today first", () => {
    const days: CalendarDay[] = [
      {
        date: "2026-07-05",
        entries: [createEntry(1, 101, "2026-07-05")],
      },
      {
        date: "2026-07-08",
        entries: [createEntry(2, 201, "2026-07-08")],
      },
      {
        date: "2026-07-11",
        entries: [createEntry(3, 301, "2026-07-11")],
      },
      {
        date: "2026-07-14",
        entries: [createEntry(4, 401, "2026-07-14")],
      },
    ];

    const result = pickUnwatchedPast(days, today, new Set());

    // Total unique series in past: Series 1, 2, 3, 4
    // Sliced last 3: Series 2, 3, 4
    // Reversed (nearest-to-today first): Series 4, Series 3, Series 2
    expect(result).toHaveLength(3);
    expect(result[0]?.episodeId).toBe(401);
    expect(result[1]?.episodeId).toBe(301);
    expect(result[2]?.episodeId).toBe(201);
  });
});
