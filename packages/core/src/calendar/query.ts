import type { EpisodeType, ImageRef, WatchProviderInfo } from "@baykus/provider-sdk";
import { and, eq, gte, isNotNull, isNull, lte, ne } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { todayUtc } from "../library/progress.ts";

export interface CalendarEntry {
  itemId: number;
  title: string;
  posterRef: ImageRef | null;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  episodeType: EpisodeType | null;
  network: string | null;
  watchProviders: WatchProviderInfo[];
  /** Only set on recentlyAired entries — upcoming entries are already grouped by date. */
  airDate?: string;
}

export interface CalendarDay {
  date: string;
  entries: CalendarEntry[];
}

export interface CalendarResponse {
  upcoming: CalendarDay[];
  recentlyAired: CalendarEntry[];
}

const RECENTLY_AIRED_WINDOW_DAYS = 14;

function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type EntryRow = {
  itemId: number;
  title: string;
  posterRef: ImageRef | null;
  networks: { name: string }[] | null;
  watchProviders: WatchProviderInfo[] | null;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  episodeType: EpisodeType | null;
  airDate: string | null;
};

function toEntry(row: EntryRow): CalendarEntry {
  return {
    itemId: row.itemId,
    title: row.title,
    posterRef: row.posterRef,
    episodeId: row.episodeId,
    s: row.s,
    e: row.e,
    episodeTitle: row.episodeTitle,
    episodeType: row.episodeType,
    network: row.networks?.[0]?.name ?? null,
    watchProviders: row.watchProviders ?? [],
  };
}

const entryColumns = {
  itemId: schema.items.id,
  title: schema.items.title,
  posterRef: schema.items.posterRef,
  networks: schema.items.networks,
  watchProviders: schema.items.watchProviders,
  episodeId: schema.episodes.id,
  s: schema.episodes.seasonNumber,
  e: schema.episodes.episodeNumber,
  episodeTitle: schema.episodes.title,
  episodeType: schema.episodes.episodeType,
  airDate: schema.episodes.airDate,
};

/**
 * contracts/api.md §Calendar. Both windows are scoped to `watching`-status
 * items only (E9 + tasks.md M5.3's DoD phrasing). `upcoming` is grouped by
 * date; `recentlyAired` is a flat list (last 14 days, unwatched only) with
 * an explicit `airDate` per entry since there's no day-grouping wrapper.
 */
export function getCalendar(
  db: LibraryDatabase,
  opts: { from?: string; to?: string } = {},
): CalendarResponse {
  const today = todayUtc();
  const from = opts.from ?? today;
  const to = opts.to ?? addDaysToDate(today, 30);

  const upcomingRows = db
    .select(entryColumns)
    .from(schema.episodes)
    .innerJoin(schema.items, eq(schema.items.id, schema.episodes.itemId))
    .innerJoin(schema.tracking, eq(schema.tracking.itemId, schema.items.id))
    .where(
      and(
        eq(schema.tracking.status, "watching"),
        ne(schema.episodes.seasonNumber, 0),
        isNotNull(schema.episodes.airDate),
        gte(schema.episodes.airDate, from),
        lte(schema.episodes.airDate, to),
      ),
    )
    .orderBy(schema.episodes.airDate)
    .all();

  const byDate = new Map<string, CalendarEntry[]>();
  for (const row of upcomingRows) {
    const date = row.airDate;
    if (!date) continue;
    const list = byDate.get(date) ?? [];
    list.push(toEntry(row));
    byDate.set(date, list);
  }
  const upcoming = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, entries]) => ({ date, entries }));

  const recentFrom = addDaysToDate(today, -RECENTLY_AIRED_WINDOW_DAYS);
  const recentRows = db
    .select(entryColumns)
    .from(schema.episodes)
    .innerJoin(schema.items, eq(schema.items.id, schema.episodes.itemId))
    .innerJoin(schema.tracking, eq(schema.tracking.itemId, schema.items.id))
    .leftJoin(schema.watches, eq(schema.watches.episodeId, schema.episodes.id))
    .where(
      and(
        eq(schema.tracking.status, "watching"),
        ne(schema.episodes.seasonNumber, 0),
        isNotNull(schema.episodes.airDate),
        gte(schema.episodes.airDate, recentFrom),
        lte(schema.episodes.airDate, today),
        isNull(schema.watches.id),
      ),
    )
    .orderBy(schema.episodes.airDate)
    .all();

  const recentlyAired = recentRows.map((row) => {
    const entry = toEntry(row);
    return row.airDate ? { ...entry, airDate: row.airDate } : entry;
  });

  return { upcoming, recentlyAired };
}
