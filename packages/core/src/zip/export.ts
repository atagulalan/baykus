import type { ExternalIds } from "@baykus/provider-sdk";
import { type Archiver, ZipArchive } from "archiver";
import { eq } from "drizzle-orm";
import type { LibraryDatabase } from "../db/open.ts";
import * as schema from "../db/schema.ts";
import { canonicalJson } from "./canonical.ts";
import type {
  ZipItemEntry,
  ZipManifest,
  ZipRatingEntry,
  ZipSeasonEntry,
  ZipSettings,
  ZipWatchEntry,
} from "./types.ts";

const APP_VERSION = "0.1.0";
const SCHEMA_VERSION = 6;

type ItemRow = typeof schema.items.$inferSelect;
type TrackingRow = typeof schema.tracking.$inferSelect;
type ItemIdFields = Pick<ItemRow, "tmdbId" | "tvmazeId" | "imdbId" | "tvdbId">;

function toExternalIds(item: ItemIdFields): ExternalIds {
  const ids: ExternalIds = {};
  if (item.tmdbId != null) ids.tmdbId = item.tmdbId;
  if (item.tvmazeId != null) ids.tvmazeId = item.tvmazeId;
  if (item.imdbId != null) ids.imdbId = item.imdbId;
  if (item.tvdbId != null) ids.tvdbId = item.tvdbId;
  return ids;
}

/** Deterministic, always-non-empty (every item has >=1 external id) — the sort key for arrays. */
function externalIdsSortKey(ids: ExternalIds): string {
  return [
    ids.tmdbId != null ? `tmdb:${ids.tmdbId}` : "",
    ids.tvmazeId != null ? `tvmaze:${ids.tvmazeId}` : "",
    ids.imdbId ? `imdb:${ids.imdbId}` : "",
    ids.tvdbId != null ? `tvdb:${ids.tvdbId}` : "",
  ].join("|");
}

function buildItemEntry(
  item: ItemRow,
  tracking: TrackingRow,
  episodesByItemId: Map<number, (typeof schema.episodes.$inferSelect)[]>,
  seasonsByItemId: Map<number, (typeof schema.seasons.$inferSelect)[]>,
): ZipItemEntry {
  const episodesBySeason = new Map<number, ZipSeasonEntry["episodes"]>();
  for (const ep of episodesByItemId.get(item.id) ?? []) {
    const list = episodesBySeason.get(ep.seasonNumber) ?? [];
    list.push({
      s: ep.seasonNumber,
      e: ep.episodeNumber,
      title: ep.title,
      overview: ep.overview,
      airDate: ep.airDate,
      runtimeMin: ep.runtimeMin,
      type: ep.episodeType,
      stillRef: ep.stillRef,
      externalRatings: ep.externalRatings,
    });
    episodesBySeason.set(ep.seasonNumber, list);
  }

  const seasons: ZipSeasonEntry[] = (seasonsByItemId.get(item.id) ?? [])
    .map((s) => ({
      number: s.number,
      name: s.name,
      overview: s.overview,
      posterRef: s.posterRef,
      airDate: s.airDate,
      episodes: (episodesBySeason.get(s.number) ?? []).sort((a, b) => a.e - b.e),
    }))
    .sort((a, b) => a.number - b.number);

  return {
    mediaType: item.mediaType,
    title: item.title,
    externalIds: toExternalIds(item),
    tracking: {
      manualList: tracking.manualList,
      pushMuted: tracking.pushMuted,
      note: tracking.note,
      listChangedAt: tracking.listChangedAt,
      favorite: tracking.favorite,
      needsReview: tracking.needsReview,
    },
    metadata: {
      originalTitle: item.originalTitle,
      overview: item.overview,
      tagline: item.tagline,
      releaseStatus: item.releaseStatus,
      firstAirDate: item.firstAirDate,
      lastAirDate: item.lastAirDate,
      originCountry: item.originCountry,
      originalLanguage: item.originalLanguage,
      episodeRunTimes: item.episodeRunTimes,
      networks: item.networks,
      genres: item.genres,
      tags: item.tags,
      cast: item.cast,
      contentRatings: item.contentRatings,
      posterRef: item.posterRef,
      backdropRef: item.backdropRef,
      logoRef: item.logoRef,
      watchProviders: item.watchProviders,
      externalRatings: item.externalRatings,
      seasons,
    },
    addedAt: item.addedAt,
    addedVia: item.addedVia,
    lastRefreshedAt: item.lastRefreshedAt,
  };
}

function buildItemEntries(db: LibraryDatabase): ZipItemEntry[] {
  const itemRows = db.select().from(schema.items).all();
  const trackingRows = db.select().from(schema.tracking).all();
  const trackingByItemId = new Map(trackingRows.map((t) => [t.itemId, t]));

  const episodeRows = db.select().from(schema.episodes).all();
  const episodesByItemId = new Map<number, typeof episodeRows>();
  for (const ep of episodeRows) {
    const list = episodesByItemId.get(ep.itemId) ?? [];
    list.push(ep);
    episodesByItemId.set(ep.itemId, list);
  }

  const seasonRows = db.select().from(schema.seasons).all();
  const seasonsByItemId = new Map<number, typeof seasonRows>();
  for (const s of seasonRows) {
    const list = seasonsByItemId.get(s.itemId) ?? [];
    list.push(s);
    seasonsByItemId.set(s.itemId, list);
  }

  const entries: ZipItemEntry[] = [];
  for (const item of itemRows) {
    const tracking = trackingByItemId.get(item.id);
    if (!tracking) continue; // every item has 1:1 tracking; defensive skip only
    entries.push(buildItemEntry(item, tracking, episodesByItemId, seasonsByItemId));
  }

  return entries.sort((a, b) =>
    externalIdsSortKey(a.externalIds) < externalIdsSortKey(b.externalIds) ? -1 : 1,
  );
}

function buildWatchEntries(db: LibraryDatabase): ZipWatchEntry[] {
  const rows = db
    .select({
      itemId: schema.items.id,
      tmdbId: schema.items.tmdbId,
      tvmazeId: schema.items.tvmazeId,
      imdbId: schema.items.imdbId,
      tvdbId: schema.items.tvdbId,
      s: schema.episodes.seasonNumber,
      e: schema.episodes.episodeNumber,
      watchedAt: schema.watches.watchedAt,
      source: schema.watches.source,
      dateUnknown: schema.watches.dateUnknown,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.episodes.id, schema.watches.episodeId))
    .innerJoin(schema.items, eq(schema.items.id, schema.watches.itemId))
    .all();

  const entries = rows.map((row) => {
    const series = toExternalIds(row);
    return {
      series,
      s: row.s,
      e: row.e,
      watchedAt: row.watchedAt,
      source: row.source,
      dateUnknown: row.dateUnknown,
    };
  });

  return entries.sort((a, b) => {
    const key = `${externalIdsSortKey(a.series)}|${a.s}|${a.e}|${a.watchedAt}`;
    const otherKey = `${externalIdsSortKey(b.series)}|${b.s}|${b.e}|${b.watchedAt}`;
    return key < otherKey ? -1 : 1;
  });
}

function buildRatingEntries(db: LibraryDatabase): ZipRatingEntry[] {
  const ratingRows = db.select().from(schema.ratings).all();
  const itemRows = db.select().from(schema.items).all();
  const itemById = new Map(itemRows.map((i) => [i.id, i]));
  const episodeRows = db.select().from(schema.episodes).all();
  const episodeById = new Map(episodeRows.map((e) => [e.id, e]));

  const entries: ZipRatingEntry[] = [];
  for (const rating of ratingRows) {
    if (rating.targetType === "item") {
      const item = itemById.get(rating.targetId);
      if (!item) continue;
      entries.push({
        target: "item",
        series: toExternalIds(item),
        value: rating.value,
        ratedAt: rating.ratedAt,
      });
    } else {
      const episode = episodeById.get(rating.targetId);
      const item = episode ? itemById.get(episode.itemId) : undefined;
      if (!episode || !item) continue;
      entries.push({
        target: "episode",
        series: toExternalIds(item),
        s: episode.seasonNumber,
        e: episode.episodeNumber,
        value: rating.value,
        ratedAt: rating.ratedAt,
      });
    }
  }

  return entries.sort((a, b) => {
    const key = `${a.target}|${externalIdsSortKey(a.series)}|${a.s ?? -1}|${a.e ?? -1}`;
    const otherKey = `${b.target}|${externalIdsSortKey(b.series)}|${b.s ?? -1}|${b.e ?? -1}`;
    return key < otherKey ? -1 : 1;
  });
}

function buildSettings(db: LibraryDatabase, includeSecrets: boolean): ZipSettings {
  const rows = db.select().from(schema.settings).all();
  const out: ZipSettings = {};
  for (const row of rows) {
    if (row.key === "tmdb_api_key" && !includeSecrets) continue;
    out[row.key] = row.value;
  }
  return out;
}

function buildManifest(
  now: string,
  counts: { items: number; watches: number; ratings: number },
): ZipManifest {
  return {
    app: "baykus",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    appVersion: APP_VERSION,
    mediaTypes: ["series"],
    counts,
  };
}

export interface ExportOptions {
  includeSecrets?: boolean;
  /** Injectable for deterministic tests (the round-trip test needs two exports to agree). */
  now?: string;
}

/** Article III: streams manifest.json + library/{items,watches,ratings,settings}.json as a zip. */
export function exportLibraryZip(db: LibraryDatabase, opts: ExportOptions = {}): Archiver {
  const now = opts.now ?? new Date().toISOString();
  const items = buildItemEntries(db);
  const watches = buildWatchEntries(db);
  const ratings = buildRatingEntries(db);
  const settings = buildSettings(db, opts.includeSecrets ?? false);
  const manifest = buildManifest(now, {
    items: items.length,
    watches: watches.length,
    ratings: ratings.length,
  });

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.append(canonicalJson(manifest), { name: "manifest.json" });
  archive.append(canonicalJson(items), { name: "library/items.json" });
  archive.append(canonicalJson(watches), { name: "library/watches.json" });
  archive.append(canonicalJson(ratings), { name: "library/ratings.json" });
  archive.append(canonicalJson(settings), { name: "library/settings.json" });
  void archive.finalize();
  return archive;
}
