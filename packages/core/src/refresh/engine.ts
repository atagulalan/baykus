import type { ExternalIds, MetadataProvider } from "@baykus/provider-sdk";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { episodeNewlyAiredSince, normalizeAirStamp } from "../library/airing.ts";

/** E63: deliberately a constant, not a settings key (see spec 005 §Non-goals). */
export const STALE_REFRESH_HOURS = 24;

/** E63: full ISO-timestamp compare — null (never refreshed) always counts as stale. */
export function isStale(lastRefreshedAt: string | null, now: string): boolean {
  if (lastRefreshedAt === null) return true;
  const thresholdMs = new Date(now).getTime() - STALE_REFRESH_HOURS * 60 * 60 * 1000;
  return new Date(lastRefreshedAt).getTime() < thresholdMs;
}

export interface RefreshResult {
  itemId: number;
  ok: boolean;
  newEpisodes: number;
  refreshedAt: string;
  error?: string;
}

type ItemRow = typeof schema.items.$inferSelect;

function toExternalIds(item: ItemRow): ExternalIds {
  const ids: ExternalIds = {};
  if (item.tmdbId != null) ids.tmdbId = item.tmdbId;
  if (item.tvmazeId != null) ids.tvmazeId = item.tvmazeId;
  if (item.imdbId != null) ids.imdbId = item.imdbId;
  if (item.tvdbId != null) ids.tvdbId = item.tvdbId;
  return ids;
}

interface ExternalIdFill {
  tmdbId?: number;
  tvmazeId?: number;
  imdbId?: string;
  tvdbId?: number;
}

/**
 * E53: fill-only merge of the refreshed provider's externalIds into the
 * item's NULL id columns — never overwrites a non-null column, and silently
 * drops a candidate already held by a *different* item (columns are UNIQUE;
 * a constraint abort must not fail the whole refresh over a metadata nicety).
 */
function fillExternalIds(
  tx: LibraryDatabase,
  itemId: number,
  item: ItemRow,
  externalIds: ExternalIds,
): ExternalIdFill {
  const fill: ExternalIdFill = {};

  if (item.tmdbId == null && externalIds.tmdbId != null) {
    const conflict = tx
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(and(eq(schema.items.tmdbId, externalIds.tmdbId), ne(schema.items.id, itemId)))
      .get();
    if (!conflict) fill.tmdbId = externalIds.tmdbId;
  }
  if (item.tvmazeId == null && externalIds.tvmazeId != null) {
    const conflict = tx
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(and(eq(schema.items.tvmazeId, externalIds.tvmazeId), ne(schema.items.id, itemId)))
      .get();
    if (!conflict) fill.tvmazeId = externalIds.tvmazeId;
  }
  if (item.imdbId == null && externalIds.imdbId != null) {
    const conflict = tx
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(and(eq(schema.items.imdbId, externalIds.imdbId), ne(schema.items.id, itemId)))
      .get();
    if (!conflict) fill.imdbId = externalIds.imdbId;
  }
  if (item.tvdbId == null && externalIds.tvdbId != null) {
    const conflict = tx
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(and(eq(schema.items.tvdbId, externalIds.tvdbId), ne(schema.items.id, itemId)))
      .get();
    if (!conflict) fill.tvdbId = externalIds.tvdbId;
  }

  return fill;
}

/**
 * Re-fetches an item's details and merges them in:
 * - item-level fields are overwritten with the fresh values (title, overview,
 *   posters, release status, genres, ...) — never the enrichment-only fields
 *   (externalRatings, watchProviders), which aren't part of getSeriesDetails.
 * - seasons are upserted by (itemId, number).
 * - episodes are matched by (itemId, seasonNumber, episodeNumber) — E12,
 *   never provider episode ids. Matched episodes are updated; new ones are
 *   inserted. Episodes no longer returned by the provider are deleted UNLESS
 *   they have watch events, which are always kept — E11.
 * - newEpisodes counts episodes whose airDate newly falls into the
 *   (previous lastRefreshedAt, now] window (plain-date comparison, E3-style).
 *
 * Throws (and logs a failed refresh_log row) if the provider call fails —
 * the caller decides what that means (502 for a single refresh, a swallowed
 * per-item failure inside refreshAll).
 */
export async function refreshItem(
  db: LibraryDatabase,
  provider: MetadataProvider,
  itemId: number,
  now: string = new Date().toISOString(),
): Promise<RefreshResult> {
  const item = db.select().from(schema.items).where(eq(schema.items.id, itemId)).get();
  if (!item) throw new Error(`refreshItem: item ${itemId} not found`);

  let details: Awaited<ReturnType<MetadataProvider["getSeriesDetails"]>>;
  try {
    details = await provider.getSeriesDetails(toExternalIds(item));
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    db.insert(schema.refreshLog)
      .values({ itemId, ranAt: now, ok: false, newEpisodeCount: 0, error })
      .run();
    throw cause;
  }

  const previousRefreshAt = item.lastRefreshedAt ?? "";
  const nowDate = new Date(now);
  let newEpisodes = 0;

  db.transaction((tx) => {
    const externalIdFill = fillExternalIds(tx, itemId, item, details.externalIds);

    tx.update(schema.items)
      .set({
        title: details.title,
        originalTitle: details.originalTitle ?? null,
        tagline: details.tagline ?? null,
        overview: details.overview ?? null,
        posterRef: details.posterRef ?? null,
        backdropRef: details.backdropRef ?? null,
        logoRef: details.logoRef ?? null,
        releaseStatus: details.releaseStatus ?? null,
        firstAirDate: details.firstAirDate ?? null,
        lastAirDate: details.lastAirDate ?? null,
        originCountry:
          details.originCountry && details.originCountry.length > 0
            ? details.originCountry.join(",")
            : null,
        originalLanguage: details.originalLanguage ?? null,
        episodeRunTimes: details.episodeRunTimes ?? null,
        networks: details.networks ?? null,
        genres: details.genres ?? null,
        contentRatings: details.contentRatings ?? null,
        lastRefreshedAt: now,
        ...externalIdFill,
      })
      .where(eq(schema.items.id, itemId))
      .run();

    for (const season of details.seasons) {
      const existingSeason = tx
        .select({ id: schema.seasons.id })
        .from(schema.seasons)
        .where(and(eq(schema.seasons.itemId, itemId), eq(schema.seasons.number, season.number)))
        .get();
      const values = {
        name: season.name ?? null,
        overview: season.overview ?? null,
        posterRef: season.posterRef ?? null,
        airDate: season.airDate ?? null,
      };
      if (existingSeason) {
        tx.update(schema.seasons).set(values).where(eq(schema.seasons.id, existingSeason.id)).run();
      } else {
        tx.insert(schema.seasons)
          .values({ itemId, number: season.number, ...values })
          .run();
      }
    }

    const newByKey = new Map(
      details.seasons.flatMap((season) =>
        season.episodes.map((ep) => [`${ep.seasonNumber}:${ep.episodeNumber}`, ep] as const),
      ),
    );

    const existingEpisodes = tx
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.itemId, itemId))
      .all();
    const existingByKey = new Map(
      existingEpisodes.map((ep) => [`${ep.seasonNumber}:${ep.episodeNumber}`, ep] as const),
    );

    for (const [key, ep] of newByKey) {
      const existing = existingByKey.get(key);
      const values = {
        title: ep.title ?? null,
        overview: ep.overview ?? null,
        airDate: ep.airDate ?? null,
        airStamp: ep.airStamp ? normalizeAirStamp(ep.airStamp) : (existing?.airStamp ?? null),
        runtimeMin: ep.runtimeMin ?? null,
        stillRef: ep.stillRef ?? null,
        episodeType: ep.episodeType ?? null,
        externalRatings: ep.externalRatings ?? null,
      };
      if (existing) {
        tx.update(schema.episodes).set(values).where(eq(schema.episodes.id, existing.id)).run();
      } else {
        tx.insert(schema.episodes)
          .values({
            itemId,
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
            ...values,
          })
          .run();
      }
      if (
        episodeNewlyAiredSince(
          { airDate: ep.airDate ?? null, airStamp: ep.airStamp ?? null },
          previousRefreshAt,
          nowDate,
        )
      ) {
        newEpisodes++;
      }
    }

    for (const [key, existing] of existingByKey) {
      if (newByKey.has(key)) continue;
      const watchCount =
        tx
          .select({ count: sql<number>`count(*)` })
          .from(schema.watches)
          .where(eq(schema.watches.episodeId, existing.id))
          .get()?.count ?? 0;
      if (watchCount === 0) {
        tx.delete(schema.episodes).where(eq(schema.episodes.id, existing.id)).run();
      }
    }
  });

  db.insert(schema.refreshLog)
    .values({ itemId, ranAt: now, ok: true, newEpisodeCount: newEpisodes, error: null })
    .run();

  return { itemId, ok: true, newEpisodes, refreshedAt: now };
}

/** E64: NULL `lastRefreshedAt` first, then oldest-first. */
function orderByStaleness(rows: { id: number; lastRefreshedAt: string | null }[]): number[] {
  return [...rows]
    .sort((a, b) => {
      if (a.lastRefreshedAt === b.lastRefreshedAt) return 0;
      if (a.lastRefreshedAt === null) return -1;
      if (b.lastRefreshedAt === null) return 1;
      return a.lastRefreshedAt < b.lastRefreshedAt ? -1 : 1;
    })
    .map((r) => r.id);
}

/** E64: narrows `itemIds` to the stale ones (E63), NULL-`lastRefreshedAt` first then oldest-first. */
export function filterStaleItemIds(
  db: LibraryDatabase,
  itemIds: number[],
  now: string = new Date().toISOString(),
): number[] {
  if (itemIds.length === 0) return [];
  const rows = db
    .select({ id: schema.items.id, lastRefreshedAt: schema.items.lastRefreshedAt })
    .from(schema.items)
    .where(inArray(schema.items.id, itemIds))
    .all();
  return orderByStaleness(rows.filter((r) => isStale(r.lastRefreshedAt, now)));
}

export interface RefreshAllOptions {
  /** E64: narrow to stale items (E63), NULL-`lastRefreshedAt` first then oldest-first. */
  staleOnly?: boolean;
  /** Injectable for deterministic tests. */
  now?: string;
}

/**
 * Refreshes every item in `itemIds` (or, with `staleOnly`, just the stale ones
 * among them), at most `concurrency` in flight at once, yielding a result for
 * each as its batch completes. A single item failing never aborts the run —
 * it's yielded as `{ok: false, error}`.
 */
export async function* refreshAll(
  db: LibraryDatabase,
  provider: MetadataProvider,
  itemIds: number[],
  concurrency = 3,
  opts: RefreshAllOptions = {},
): AsyncGenerator<RefreshResult> {
  const targetIds = opts.staleOnly
    ? filterStaleItemIds(db, itemIds, opts.now ?? new Date().toISOString())
    : itemIds;

  for (let i = 0; i < targetIds.length; i += concurrency) {
    const batch = targetIds.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map((id) => refreshItem(db, provider, id)));
    for (let j = 0; j < settled.length; j++) {
      const outcome = settled[j];
      const itemId = batch[j];
      if (itemId === undefined || outcome === undefined) continue;
      if (outcome.status === "fulfilled") {
        yield outcome.value;
      } else {
        yield {
          itemId,
          ok: false,
          newEpisodes: 0,
          refreshedAt: new Date().toISOString(),
          error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        };
      }
    }
  }
}
