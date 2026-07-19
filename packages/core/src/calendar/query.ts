import type { EpisodeType, ImageRef, WatchProviderInfo } from "@baykus/provider-sdk";
import { and, eq, gt, gte, inArray, isNotNull, lt, lte } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { todayUtc } from "../library/airing.ts";
import { computeCategories, type WatchCategory } from "../library/category.ts";

export interface CalendarEntry {
  itemId: number;
  title: string;
  posterRef: ImageRef | null;
  episodeId: number;
  s: number;
  e: number;
  episodeTitle: string | null;
  episodeType: EpisodeType | null;
  /** From seasons.name, joined on (itemId, seasonNumber) — feeds the OVA heuristic (E23). */
  seasonName: string | null;
  airDate: string;
  airStamp: string | null;
  network: string | null;
  watchProviders: WatchProviderInfo[];
  /** True when the episode has at least one watch event (needed by Schedule mode strips). */
  isWatched: boolean;
}

export interface CalendarDay {
  date: string;
  entries: CalendarEntry[];
}

export interface CalendarResponse {
  days: CalendarDay[];
  /** True when any active-trio episode exists with airDate > `to`. */
  hasMoreFuture?: boolean;
  /** True when any active-trio episode exists with airDate < `from`. */
  hasMorePast?: boolean;
}

/** E22: calendar (both modes) is scoped to the active trio. */
const ACTIVE_TRIO: ReadonlySet<WatchCategory> = new Set([
  "watching",
  "not_watched_recently",
  "up_to_date",
]);

const DEFAULT_FROM_DAYS = -14;
const DEFAULT_TO_DAYS = 90;

function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface EntryRow {
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
  seasonName: string | null;
  airDate: string;
  airStamp: string | null;
}

function toEntry(row: EntryRow, isWatched: boolean): CalendarEntry {
  return {
    itemId: row.itemId,
    title: row.title,
    posterRef: row.posterRef,
    episodeId: row.episodeId,
    s: row.s,
    e: row.e,
    episodeTitle: row.episodeTitle,
    episodeType: row.episodeType,
    seasonName: row.seasonName,
    airDate: row.airDate,
    airStamp: row.airStamp,
    network: row.networks?.[0]?.name ?? null,
    watchProviders: row.watchProviders ?? [],
    isWatched,
  };
}

/**
 * contracts/api.md 002 §Calendar (as amended for Schedule mode). Single
 * ascending `days` list. Scope: item category ∈ active trio (E22). Specials
 * included (E23). Past aired episodes are included with `isWatched` so the
 * Schedule (Yayın Akışı) strips stay continuous; Timeline/Month hide already-
 * watched past rows client-side (E24 gap-tracker semantics preserved there).
 * Range validation is the route's job (M11.2), not this function's.
 */
export function getCalendar(
  db: LibraryDatabase,
  opts: { from?: string; to?: string } = {},
): CalendarResponse {
  const from = opts.from ?? addDaysToDate(todayUtc(), DEFAULT_FROM_DAYS);
  const to = opts.to ?? addDaysToDate(todayUtc(), DEFAULT_TO_DAYS);

  const rows: EntryRow[] = db
    .select({
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
      seasonName: schema.seasons.name,
      airDate: schema.episodes.airDate,
      airStamp: schema.episodes.airStamp,
    })
    .from(schema.episodes)
    .innerJoin(schema.items, eq(schema.items.id, schema.episodes.itemId))
    .leftJoin(
      schema.seasons,
      and(
        eq(schema.seasons.itemId, schema.episodes.itemId),
        eq(schema.seasons.number, schema.episodes.seasonNumber),
      ),
    )
    .where(
      and(
        isNotNull(schema.episodes.airDate),
        gte(schema.episodes.airDate, from),
        lte(schema.episodes.airDate, to),
      ),
    )
    .orderBy(schema.episodes.airDate)
    .all() as EntryRow[];

  // Active-trio membership for hasMore* needs item ids beyond the page range.
  const allItemIds = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .all()
    .map((r) => r.id);
  const allCategories = computeCategories(db, allItemIds);
  const trioItemIds = allItemIds.filter((id) => {
    const category = allCategories.get(id);
    return category !== undefined && ACTIVE_TRIO.has(category);
  });

  let hasMorePast = false;
  let hasMoreFuture = false;
  if (trioItemIds.length > 0) {
    const past = db
      .select({ id: schema.episodes.id })
      .from(schema.episodes)
      .where(
        and(
          inArray(schema.episodes.itemId, trioItemIds),
          isNotNull(schema.episodes.airDate),
          lt(schema.episodes.airDate, from),
        ),
      )
      .limit(1)
      .get();
    hasMorePast = past !== undefined;
    const future = db
      .select({ id: schema.episodes.id })
      .from(schema.episodes)
      .where(
        and(
          inArray(schema.episodes.itemId, trioItemIds),
          isNotNull(schema.episodes.airDate),
          gt(schema.episodes.airDate, to),
        ),
      )
      .limit(1)
      .get();
    hasMoreFuture = future !== undefined;
  }

  if (rows.length === 0) {
    return { days: [], hasMorePast, hasMoreFuture };
  }

  const itemIds = [...new Set(rows.map((r) => r.itemId))];
  const categories = computeCategories(db, itemIds);
  const inTrio = rows.filter((r) => {
    const category = categories.get(r.itemId);
    return category !== undefined && ACTIVE_TRIO.has(category);
  });
  if (inTrio.length === 0) {
    return { days: [], hasMorePast, hasMoreFuture };
  }

  const episodeIds = inTrio.map((r) => r.episodeId);
  const watchedEpisodeIds = new Set(
    db
      .select({ episodeId: schema.watches.episodeId })
      .from(schema.watches)
      .where(inArray(schema.watches.episodeId, episodeIds))
      .all()
      .map((w) => w.episodeId),
  );

  const byDate = new Map<string, CalendarEntry[]>();
  for (const row of inTrio) {
    const list = byDate.get(row.airDate) ?? [];
    list.push(toEntry(row, watchedEpisodeIds.has(row.episodeId)));
    byDate.set(row.airDate, list);
  }

  const days = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, entries]) => ({ date, entries }));

  return { days, hasMorePast, hasMoreFuture };
}
