import type { ExternalIds } from "@baykus/provider-sdk";
import { and, eq, or } from "drizzle-orm";
import * as yauzl from "yauzl";
import type { LibraryDatabase } from "../db/open.ts";
import type { RatingTargetType } from "../db/schema.ts";
import * as schema from "../db/schema.ts";
import type {
  ZipItemEntry,
  ZipManifest,
  ZipRatingEntry,
  ZipSettings,
  ZipWatchEntry,
} from "./types.ts";

export type ImportMode = "replace" | "merge";

export type ZipImportErrorCode = "BAD_MANIFEST" | "UNSUPPORTED_SCHEMA";

export class ZipImportError extends Error {
  readonly code: ZipImportErrorCode;

  constructor(code: ZipImportErrorCode, message: string) {
    super(message);
    this.name = "ZipImportError";
    this.code = code;
  }
}

export interface ImportResult {
  items: number;
  watches: number;
  ratings: number;
  mode: ImportMode;
  warnings: string[];
}

const SUPPORTED_SCHEMA_VERSIONS = [1];

interface ParsedZip {
  manifest: ZipManifest;
  items: ZipItemEntry[];
  watches: ZipWatchEntry[];
  ratings: ZipRatingEntry[];
  settings: ZipSettings;
}

async function readZipJsonEntries(buffer: Buffer): Promise<Record<string, string>> {
  let zipfile: yauzl.ZipFile;
  try {
    zipfile = await yauzl.fromBufferPromise(buffer, { lazyEntries: true });
  } catch (cause) {
    throw new ZipImportError("BAD_MANIFEST", `not a valid zip file: ${String(cause)}`);
  }

  const out: Record<string, string> = {};
  await new Promise<void>((resolve, reject) => {
    zipfile.on("error", reject);
    zipfile.on("end", resolve);
    zipfile.on("entry", (entry) => {
      zipfile.openReadStream(entry, (err, stream) => {
        if (err) return reject(err);
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          out[entry.fileName] = Buffer.concat(chunks).toString("utf-8");
          zipfile.readEntry();
        });
        stream.on("error", reject);
      });
    });
    zipfile.readEntry();
  });
  return out;
}

function parseJsonEntry<T>(entries: Record<string, string>, name: string, fallback: T): T {
  const raw = entries[name];
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ZipImportError("BAD_MANIFEST", `${name} is not valid JSON`);
  }
}

async function parseZip(buffer: Buffer): Promise<ParsedZip> {
  const entries = await readZipJsonEntries(buffer);

  const manifestRaw = entries["manifest.json"];
  if (manifestRaw === undefined) {
    throw new ZipImportError("BAD_MANIFEST", "manifest.json missing from zip");
  }
  let manifest: ZipManifest;
  try {
    manifest = JSON.parse(manifestRaw) as ZipManifest;
  } catch {
    throw new ZipImportError("BAD_MANIFEST", "manifest.json is not valid JSON");
  }
  if (manifest.app !== "baykus" || typeof manifest.schemaVersion !== "number") {
    throw new ZipImportError("BAD_MANIFEST", "manifest.json is missing required fields");
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(manifest.schemaVersion)) {
    throw new ZipImportError(
      "UNSUPPORTED_SCHEMA",
      `unsupported schemaVersion ${manifest.schemaVersion}`,
    );
  }

  const items = parseJsonEntry<ZipItemEntry[]>(entries, "library/items.json", []);
  const watches = parseJsonEntry<ZipWatchEntry[]>(entries, "library/watches.json", []);
  const ratings = parseJsonEntry<ZipRatingEntry[]>(entries, "library/ratings.json", []);
  const settings = parseJsonEntry<ZipSettings>(entries, "library/settings.json", {});
  if (!Array.isArray(items) || !Array.isArray(watches) || !Array.isArray(ratings)) {
    throw new ZipImportError("BAD_MANIFEST", "library/*.json entries must be arrays");
  }

  return { manifest, items, watches, ratings, settings };
}

function findItemByExternalIds(db: LibraryDatabase, ids: ExternalIds): number | null {
  const conditions = [
    ids.tmdbId != null ? eq(schema.items.tmdbId, ids.tmdbId) : null,
    ids.tvmazeId != null ? eq(schema.items.tvmazeId, ids.tvmazeId) : null,
    ids.imdbId ? eq(schema.items.imdbId, ids.imdbId) : null,
    ids.tvdbId != null ? eq(schema.items.tvdbId, ids.tvdbId) : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (conditions.length === 0) return null;

  const row = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(or(...conditions))
    .limit(1)
    .get();
  return row?.id ?? null;
}

function findEpisode(
  db: LibraryDatabase,
  itemId: number,
  s: number,
  e: number,
): { id: number } | undefined {
  return db
    .select({ id: schema.episodes.id })
    .from(schema.episodes)
    .where(
      and(
        eq(schema.episodes.itemId, itemId),
        eq(schema.episodes.seasonNumber, s),
        eq(schema.episodes.episodeNumber, e),
      ),
    )
    .get();
}

function toItemValues(entry: ZipItemEntry, mergedIds: ExternalIds) {
  const m = entry.metadata;
  return {
    mediaType: entry.mediaType,
    title: entry.title,
    originalTitle: m.originalTitle,
    tagline: m.tagline,
    overview: m.overview,
    posterRef: m.posterRef,
    backdropRef: m.backdropRef,
    logoRef: m.logoRef,
    releaseStatus: m.releaseStatus,
    firstAirDate: m.firstAirDate,
    lastAirDate: m.lastAirDate,
    originCountry: m.originCountry,
    originalLanguage: m.originalLanguage,
    episodeRunTimes: m.episodeRunTimes,
    networks: m.networks,
    genres: m.genres,
    tags: m.tags,
    contentRatings: m.contentRatings,
    watchProviders: m.watchProviders,
    externalRatings: m.externalRatings,
    tmdbId: mergedIds.tmdbId ?? null,
    tvmazeId: mergedIds.tvmazeId ?? null,
    imdbId: mergedIds.imdbId ?? null,
    tvdbId: mergedIds.tvdbId ?? null,
  };
}

/** Upserts seasons/episodes by (number)/(s,e) — never deletes, so watch-linked rows are always kept. */
function upsertSeasonsAndEpisodes(db: LibraryDatabase, itemId: number, entry: ZipItemEntry): void {
  for (const season of entry.metadata.seasons) {
    const existingSeason = db
      .select({ id: schema.seasons.id })
      .from(schema.seasons)
      .where(and(eq(schema.seasons.itemId, itemId), eq(schema.seasons.number, season.number)))
      .get();
    const values = {
      name: season.name,
      overview: season.overview,
      posterRef: season.posterRef,
      airDate: season.airDate,
    };
    if (existingSeason) {
      db.update(schema.seasons).set(values).where(eq(schema.seasons.id, existingSeason.id)).run();
    } else {
      db.insert(schema.seasons)
        .values({ itemId, number: season.number, ...values })
        .run();
    }

    for (const ep of season.episodes) {
      const existingEpisode = findEpisode(db, itemId, ep.s, ep.e);
      const epValues = {
        title: ep.title,
        overview: ep.overview,
        airDate: ep.airDate,
        runtimeMin: ep.runtimeMin,
        episodeType: ep.type,
        externalRatings: ep.externalRatings,
      };
      if (existingEpisode) {
        db.update(schema.episodes)
          .set(epValues)
          .where(eq(schema.episodes.id, existingEpisode.id))
          .run();
      } else {
        db.insert(schema.episodes)
          .values({ itemId, seasonNumber: ep.s, episodeNumber: ep.e, ...epValues })
          .run();
      }
    }
  }
}

function insertItemWholesale(db: LibraryDatabase, entry: ZipItemEntry): number {
  const inserted = db
    .insert(schema.items)
    .values({
      ...toItemValues(entry, entry.externalIds),
      addedAt: entry.addedAt,
      lastRefreshedAt: entry.lastRefreshedAt,
    })
    .returning({ id: schema.items.id })
    .get();

  db.insert(schema.tracking)
    .values({
      itemId: inserted.id,
      status: entry.tracking.status,
      pushMuted: entry.tracking.pushMuted,
      note: entry.tracking.note,
      statusChangedAt: entry.tracking.statusChangedAt,
    })
    .run();

  upsertSeasonsAndEpisodes(db, inserted.id, entry);
  return inserted.id;
}

function mergeExternalIds(existing: ExternalIds, incoming: ExternalIds): ExternalIds {
  const merged: ExternalIds = {};
  const tmdbId = existing.tmdbId ?? incoming.tmdbId;
  const tvmazeId = existing.tvmazeId ?? incoming.tvmazeId;
  const imdbId = existing.imdbId ?? incoming.imdbId;
  const tvdbId = existing.tvdbId ?? incoming.tvdbId;
  if (tmdbId !== undefined) merged.tmdbId = tmdbId;
  if (tvmazeId !== undefined) merged.tvmazeId = tvmazeId;
  if (imdbId !== undefined) merged.imdbId = imdbId;
  if (tvdbId !== undefined) merged.tvdbId = tvdbId;
  return merged;
}

function mergeItem(db: LibraryDatabase, existingId: number, entry: ZipItemEntry): void {
  const existing = db.select().from(schema.items).where(eq(schema.items.id, existingId)).get();
  if (!existing) return;

  const existingIds: ExternalIds = {};
  if (existing.tmdbId != null) existingIds.tmdbId = existing.tmdbId;
  if (existing.tvmazeId != null) existingIds.tvmazeId = existing.tvmazeId;
  if (existing.imdbId != null) existingIds.imdbId = existing.imdbId;
  if (existing.tvdbId != null) existingIds.tvdbId = existing.tvdbId;
  const mergedIds = mergeExternalIds(existingIds, entry.externalIds);

  const incomingNewer =
    !existing.lastRefreshedAt ||
    (entry.lastRefreshedAt !== null && entry.lastRefreshedAt > existing.lastRefreshedAt);

  if (incomingNewer) {
    db.update(schema.items)
      .set({
        ...toItemValues(entry, mergedIds),
        lastRefreshedAt: entry.lastRefreshedAt ?? existing.lastRefreshedAt,
      })
      .where(eq(schema.items.id, existingId))
      .run();
    upsertSeasonsAndEpisodes(db, existingId, entry);
  } else if (
    mergedIds.tmdbId !== existingIds.tmdbId ||
    mergedIds.tvmazeId !== existingIds.tvmazeId ||
    mergedIds.imdbId !== existingIds.imdbId ||
    mergedIds.tvdbId !== existingIds.tvdbId
  ) {
    db.update(schema.items)
      .set({
        tmdbId: mergedIds.tmdbId ?? null,
        tvmazeId: mergedIds.tvmazeId ?? null,
        imdbId: mergedIds.imdbId ?? null,
        tvdbId: mergedIds.tvdbId ?? null,
      })
      .where(eq(schema.items.id, existingId))
      .run();
  }

  // tracking: incoming always wins (status/note/pushMuted).
  db.update(schema.tracking)
    .set({
      status: entry.tracking.status,
      pushMuted: entry.tracking.pushMuted,
      note: entry.tracking.note,
      statusChangedAt: entry.tracking.statusChangedAt,
    })
    .where(eq(schema.tracking.itemId, existingId))
    .run();
}

function upsertRating(
  db: LibraryDatabase,
  targetType: RatingTargetType,
  targetId: number,
  value: 1 | 2 | 3,
  ratedAt: string,
): void {
  db.insert(schema.ratings)
    .values({ targetType, targetId, value, ratedAt })
    .onConflictDoUpdate({
      target: [schema.ratings.targetType, schema.ratings.targetId],
      set: { value, ratedAt },
    })
    .run();
}

function wipeLibrary(db: LibraryDatabase): void {
  db.delete(schema.items).run(); // cascades tracking/seasons/episodes/watches
  db.delete(schema.ratings).run();
  db.delete(schema.settings).run();
}

/**
 * Article III: `import(export(L))` on an empty library must round-trip
 * losslessly. `mode` is required — the caller (server route) decides what an
 * empty-vs-non-empty library requires (contracts: missing mode on a
 * non-empty library is a 409, decided one layer up, not here).
 */
export async function importLibraryZip(
  db: LibraryDatabase,
  zipBuffer: Buffer,
  mode: ImportMode,
): Promise<ImportResult> {
  const parsed = await parseZip(zipBuffer);
  const warnings: string[] = [];
  let itemsWritten = 0;
  let watchesWritten = 0;
  let ratingsWritten = 0;

  db.transaction((tx) => {
    if (mode === "replace") wipeLibrary(tx);

    for (const entry of parsed.items) {
      const existingId = mode === "merge" ? findItemByExternalIds(tx, entry.externalIds) : null;
      if (existingId) {
        mergeItem(tx, existingId, entry);
      } else {
        insertItemWholesale(tx, entry);
      }
      itemsWritten++;
    }

    for (const watch of parsed.watches) {
      const itemId = findItemByExternalIds(tx, watch.series);
      if (!itemId) {
        warnings.push(`watch skipped: series not found (${JSON.stringify(watch.series)})`);
        continue;
      }
      const episode = findEpisode(tx, itemId, watch.s, watch.e);
      if (!episode) {
        warnings.push(`watch skipped: episode S${watch.s}E${watch.e} not found`);
        continue;
      }
      const existing = tx
        .select({ id: schema.watches.id })
        .from(schema.watches)
        .where(
          and(
            eq(schema.watches.episodeId, episode.id),
            eq(schema.watches.watchedAt, watch.watchedAt),
          ),
        )
        .get();
      if (existing) {
        warnings.push(`watch skipped: duplicate (episode, timestamp)`);
        continue;
      }
      tx.insert(schema.watches)
        .values({
          episodeId: episode.id,
          itemId,
          watchedAt: watch.watchedAt,
          source: watch.source,
        })
        .run();
      watchesWritten++;
    }

    for (const rating of parsed.ratings) {
      const itemId = findItemByExternalIds(tx, rating.series);
      if (!itemId) {
        warnings.push(`rating skipped: series not found (${JSON.stringify(rating.series)})`);
        continue;
      }
      let targetId: number;
      if (rating.target === "item") {
        targetId = itemId;
      } else {
        const episode = findEpisode(tx, itemId, rating.s ?? -1, rating.e ?? -1);
        if (!episode) {
          warnings.push(`rating skipped: episode S${rating.s}E${rating.e} not found`);
          continue;
        }
        targetId = episode.id;
      }
      upsertRating(tx, rating.target, targetId, rating.value, rating.ratedAt);
      ratingsWritten++;
    }

    for (const [key, value] of Object.entries(parsed.settings)) {
      tx.insert(schema.settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
        .run();
    }
  });

  return { items: itemsWritten, watches: watchesWritten, ratings: ratingsWritten, mode, warnings };
}
