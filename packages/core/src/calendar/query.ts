import type { EpisodeType, ImageRef, WatchProviderInfo } from "@baykus/provider-sdk";
import { and, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { computeCategories, type WatchCategory } from "../library/category.ts";
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
  /** From seasons.name, joined on (itemId, seasonNumber) — feeds the OVA heuristic (E23). */
  seasonName: string | null;
  airDate: string;
  network: string | null;
  watchProviders: WatchProviderInfo[];
}

export interface CalendarDay {
  date: string;
  entries: CalendarEntry[];
}

export interface CalendarResponse {
  days: CalendarDay[];
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
}

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
    seasonName: row.seasonName,
    airDate: row.airDate,
    network: row.networks?.[0]?.name ?? null,
    watchProviders: row.watchProviders ?? [],
  };
}

/**
 * contracts/api.md 002 §Calendar. Single ascending `days` list (the 001
 * upcoming/recentlyAired split is gone). Scope: item category ∈ active trio
 * (E22, computed via computeCategories — never a raw tracking column).
 * Specials (season 0) are included (E23). Entry filter (E24): airDate > today
 * always included; airDate <= today only when the episode has zero watch
 * events. Range validation is the route's job (M11.2), not this function's.
 */
export function getCalendar(
  db: LibraryDatabase,
  opts: { from?: string; to?: string } = {},
): CalendarResponse {
  const today = todayUtc();
  const from = opts.from ?? addDaysToDate(today, DEFAULT_FROM_DAYS);
  const to = opts.to ?? addDaysToDate(today, DEFAULT_TO_DAYS);

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

  if (rows.length === 0) return { days: [] };

  const itemIds = [...new Set(rows.map((r) => r.itemId))];
  const categories = computeCategories(db, itemIds);
  const inTrio = rows.filter((r) => {
    const category = categories.get(r.itemId);
    return category !== undefined && ACTIVE_TRIO.has(category);
  });
  if (inTrio.length === 0) return { days: [] };

  const episodeIds = inTrio.map((r) => r.episodeId);
  const watchedEpisodeIds = new Set(
    db
      .select({ episodeId: schema.watches.episodeId })
      .from(schema.watches)
      .where(inArray(schema.watches.episodeId, episodeIds))
      .all()
      .map((w) => w.episodeId),
  );

  const included = inTrio.filter((r) => r.airDate > today || !watchedEpisodeIds.has(r.episodeId));

  const byDate = new Map<string, CalendarEntry[]>();
  for (const row of included) {
    const list = byDate.get(row.airDate) ?? [];
    list.push(toEntry(row));
    byDate.set(row.airDate, list);
  }

  const days = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, entries]) => ({ date, entries }));

  return { days };
}
