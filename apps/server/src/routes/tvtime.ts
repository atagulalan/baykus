import { isAlreadyInLibraryError, type Library } from "@baykus/core";
import {
  matchShows,
  parseTvTimeFiles,
  resolveEpisodePosition,
  type TvTimeStatus,
} from "@baykus/importer-tvtime";
import type { ExternalIds, MetadataProvider, SeriesDetails } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { ApiError } from "../middleware/errors.ts";
import { createReportStore, type ReportStore } from "../tvtime/report-store.ts";
import { extractCsvContents } from "../tvtime/upload.ts";

const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

const externalIdsSchema = z
  .object({
    tmdbId: z.number().int().optional(),
    tvmazeId: z.number().int().optional(),
    imdbId: z.string().optional(),
    tvdbId: z.number().int().optional(),
  })
  .strict();

const confirmSchema = z
  .object({
    reportId: z.string(),
    resolutions: z.array(z.object({ name: z.string(), externalIds: externalIdsSchema })),
  })
  .strict();

// zod's `.optional()` types the field as `T | undefined` (always present); ExternalIds'
// keys are genuinely optional (`exactOptionalPropertyTypes`), so undefined values must
// be dropped rather than passed through — same pattern as routes/library.ts.
function toExternalIds(parsed: z.infer<typeof externalIdsSchema>): ExternalIds {
  const ids: ExternalIds = {};
  if (parsed.tmdbId !== undefined) ids.tmdbId = parsed.tmdbId;
  if (parsed.tvmazeId !== undefined) ids.tvmazeId = parsed.tvmazeId;
  if (parsed.imdbId !== undefined) ids.imdbId = parsed.imdbId;
  if (parsed.tvdbId !== undefined) ids.tvdbId = parsed.tvdbId;
  return ids;
}

async function fetchDetails(
  providers: MetadataProvider[],
  externalIds: ExternalIds,
): Promise<SeriesDetails | null> {
  for (const provider of providers) {
    try {
      return await provider.getSeriesDetails(externalIds);
    } catch {
      // try the next provider
    }
  }
  return null;
}

function episodePositionKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}-${episodeNumber}`;
}

/**
 * Imports one show (already-resolved SeriesDetails) plus its TV Time watch
 * events. Idempotent: addSeries()'s AlreadyInLibraryError is caught and the
 * existing item is reused instead, and addWatch()'s (episodeId, watchedAt)
 * dedupe means re-running the same file twice never doubles up watches —
 * `created: false` replays count toward `skipped`, same as unresolvable ones.
 */
async function importOneShow(
  library: Library,
  providers: MetadataProvider[],
  details: SeriesDetails,
  watchEvents: {
    tvdbEpisodeId: number;
    watchedAt: string;
    seasonNumber?: number;
    episodeNumber?: number;
  }[],
  status: TvTimeStatus = "watching",
): Promise<{ itemCreated: boolean; watchesCreated: number; watchesSkipped: number }> {
  let itemId: number;
  let itemCreated = true;
  try {
    itemId = library.addSeries(details, status).id;
  } catch (cause) {
    if (!isAlreadyInLibraryError(cause)) throw cause;
    itemId = cause.itemId;
    itemCreated = false;
  }

  const seriesDetail = library.getSeries(itemId);
  const episodeIdByPosition = new Map<string, number>();
  for (const season of seriesDetail?.seasons ?? []) {
    for (const episode of season.episodes) {
      episodeIdByPosition.set(episodePositionKey(episode.s, episode.e), episode.id);
    }
  }

  let watchesCreated = 0;
  let watchesSkipped = 0;
  for (const watchEvent of watchEvents) {
    let episodeId: number | undefined;

    // Prefer the CSV's own season/episode numbers (name-keyed/trackingV1/V2
    // rows) — they need no network round-trip and can't be thrown off by
    // provider/TVDB season-numbering discrepancies (e.g. TMDB merging
    // seasons TV Time counts separately). Only fall back to resolving the
    // TVDB episode id via the providers when the CSV didn't carry them
    // (seenEpisode rows) or the resolved position isn't in this show's
    // inventory.
    if (watchEvent.seasonNumber !== undefined && watchEvent.episodeNumber !== undefined) {
      episodeId = episodeIdByPosition.get(
        episodePositionKey(watchEvent.seasonNumber, watchEvent.episodeNumber),
      );
    }

    if (episodeId === undefined) {
      const position = await resolveEpisodePosition(providers, watchEvent.tvdbEpisodeId);
      if (position) {
        episodeId = episodeIdByPosition.get(
          episodePositionKey(position.seasonNumber, position.episodeNumber),
        );
      }
    }

    if (episodeId === undefined) {
      watchesSkipped++;
      continue;
    }
    const result = library.addWatch(episodeId, watchEvent.watchedAt, "import:tvtime");
    if (result?.created) watchesCreated++;
    else watchesSkipped++;
  }

  return { itemCreated, watchesCreated, watchesSkipped };
}

/** contracts/api.md §tvtime. */
export function createTvTimeRoutes(library: Library, providers: MetadataProvider[]): Hono {
  const app = new Hono();
  const reportStore: ReportStore = createReportStore();

  app.post("/api/import/tvtime", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "multipart field 'file' (TV Time zip or CSV) is required",
      );
    }
    if (file.size > MAX_IMPORT_BYTES) {
      throw new ApiError("PAYLOAD_TOO_LARGE", "import file exceeds 50 MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const csvContents = await extractCsvContents(buffer);
    const { shows, watches } = parseTvTimeFiles(csvContents);
    const { matched, fuzzy, unmatched } = await matchShows(shows, watches, providers);

    const watchesByTvdbId = new Map<number, typeof watches>();
    for (const watch of watches) {
      const list = watchesByTvdbId.get(watch.tvdbShowId) ?? [];
      list.push(watch);
      watchesByTvdbId.set(watch.tvdbShowId, list);
    }

    const reportId = reportStore.create({ matched, fuzzy, unmatched, watchesByTvdbId });

    return c.json({
      reportId,
      matched: matched.map((m) => ({
        name: m.name,
        tvdbId: m.tvdbId,
        resolved: m.externalIds,
        episodes: m.episodeCount,
      })),
      fuzzy: fuzzy.map((f) => ({
        name: f.name,
        candidates: f.candidates,
        episodes: f.episodeCount,
      })),
      unmatched: unmatched.map((u) => ({ name: u.name, episodes: u.episodeCount })),
    });
  });

  app.post("/api/import/tvtime/confirm", async (c) => {
    const body = confirmSchema.parse(await c.req.json());
    const report = reportStore.get(body.reportId);
    if (!report) throw new ApiError("NOT_FOUND", `report ${body.reportId} not found or expired`);

    // Build the ordered list of shows to import so we can report total upfront.
    type ShowJob = {
      name: string;
      tvdbId: number;
      details: SeriesDetails | null;
      externalIds: ExternalIds;
      episodeCount: number;
      status: TvTimeStatus;
    };
    const jobs: ShowJob[] = [];

    for (const matchedShow of report.matched) {
      jobs.push({
        name: matchedShow.name,
        tvdbId: matchedShow.tvdbId,
        details: matchedShow.details,
        externalIds: matchedShow.externalIds,
        episodeCount: matchedShow.episodeCount,
        status: matchedShow.status,
      });
    }

    const resolvedNames = new Set<string>();
    for (const resolution of body.resolutions) {
      const fuzzyShow = report.fuzzy.find((f) => f.name === resolution.name);
      if (!fuzzyShow) continue;
      resolvedNames.add(resolution.name);
      // Details will be fetched inside the stream (network call), so store null
      // and resolve lazily — keeps the pre-stream phase fast.
      jobs.push({
        name: fuzzyShow.name,
        tvdbId: fuzzyShow.tvdbId,
        details: null, // resolved lazily below
        externalIds: toExternalIds(resolution.externalIds),
        episodeCount: fuzzyShow.episodeCount,
        status: fuzzyShow.status,
      });
    }

    const total = jobs.length;

    return streamSSE(c, async (stream) => {
      let done = 0;
      let itemsCreated = 0;
      let watchesCreated = 0;
      let skipped = 0;

      for (const job of jobs) {
        done++;
        let details = job.details;

        // Fuzzy shows need their details fetched now; matched shows already
        // carry full inventory from the report phase.
        if (!details) {
          details = await fetchDetails(providers, job.externalIds);
        }

        if (!details) {
          skipped += job.episodeCount;
          await stream.writeSSE({
            event: "progress",
            data: JSON.stringify({ done, total, name: job.name, ok: false }),
          });
          continue;
        }

        try {
          const watchEvents = report.watchesByTvdbId.get(job.tvdbId) ?? [];
          const result = await importOneShow(library, providers, details, watchEvents, job.status);
          if (result.itemCreated) itemsCreated++;
          watchesCreated += result.watchesCreated;
          skipped += result.watchesSkipped;

          await stream.writeSSE({
            event: "progress",
            data: JSON.stringify({ done, total, name: job.name, ok: true }),
          });
        } catch {
          skipped += job.episodeCount;
          await stream.writeSSE({
            event: "progress",
            data: JSON.stringify({ done, total, name: job.name, ok: false }),
          });
        }
      }

      // Count skipped episodes from unresolved fuzzy and unmatched shows.
      for (const fuzzyShow of report.fuzzy) {
        if (!resolvedNames.has(fuzzyShow.name)) skipped += fuzzyShow.episodeCount;
      }
      for (const unmatchedShow of report.unmatched) {
        skipped += unmatchedShow.episodeCount;
      }

      reportStore.delete(body.reportId);

      await stream.writeSSE({
        event: "complete",
        data: JSON.stringify({ itemsCreated, watchesCreated, skipped }),
      });
    });
  });

  return app;
}
