import { isAlreadyInLibraryError, type Library, type ManualList } from "@baykus/core";
import {
  createWatchResolveContext,
  matchShows,
  parseTvTimeFiles,
  resolveWatchPosition,
  type TvTimeStatus,
  type UnderflowSeasonDetail,
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

/** E26: TvTimeStatus (the importer package's legacy status) maps to v2 manualList. */
const TVTIME_STATUS_TO_MANUAL_LIST: Record<TvTimeStatus, ManualList | null> = {
  plan_to_watch: "watch_later",
  dropped: "stopped",
  watching: null,
  completed: null,
};

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
    dateUnknown: boolean;
  }[],
  status: TvTimeStatus = "watching",
  needsReview: boolean = false,
): Promise<{ itemCreated: boolean; watchesCreated: number; watchesSkipped: number }> {
  let itemId: number;
  let itemCreated = true;
  try {
    const manualList = TVTIME_STATUS_TO_MANUAL_LIST[status];
    itemId = library.addSeries(details, {
      ...(manualList !== null ? { manualList } : {}),
      addedVia: "import:tvtime",
      needsReview,
    }).id;
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

  const resolveCtx = createWatchResolveContext(
    details,
    watchEvents,
    episodeIdByPosition,
    providers,
  );

  let watchesCreated = 0;
  let watchesSkipped = 0;
  for (const watchEvent of watchEvents) {
    // Season-level bulk mark (episode_number=0): stamp every aired episode in
    // that season with this watchedAt.
    if (watchEvent.seasonNumber !== undefined && watchEvent.episodeNumber === 0 && seriesDetail) {
      const season = seriesDetail.seasons.find((s) => s.number === watchEvent.seasonNumber);
      if (!season || season.episodes.length === 0) {
        watchesSkipped++;
        continue;
      }
      let anyCreated = false;
      for (const episode of season.episodes) {
        const result = library.addWatch(episode.id, watchEvent.watchedAt, "import:tvtime", {
          dateUnknown: watchEvent.dateUnknown,
        });
        if (result?.created) {
          watchesCreated++;
          anyCreated = true;
        }
      }
      if (!anyCreated) watchesSkipped++;
      continue;
    }

    const position = await resolveWatchPosition(watchEvent, resolveCtx);
    const episodeId = position
      ? episodeIdByPosition.get(episodePositionKey(position.seasonNumber, position.episodeNumber))
      : undefined;

    if (episodeId === undefined) {
      watchesSkipped++;
      continue;
    }
    const result = library.addWatch(episodeId, watchEvent.watchedAt, "import:tvtime", {
      dateUnknown: watchEvent.dateUnknown,
    });
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
    const { shows, watches, skippedRelics } = parseTvTimeFiles(csvContents);

    return streamSSE(c, async (stream) => {
      const { matched, fuzzy, unmatched } = await matchShows(
        shows,
        watches,
        providers,
        async (progress) => {
          await stream.writeSSE({ event: "progress", data: JSON.stringify(progress) });
        },
      );

      const watchesByTvdbId = new Map<number, typeof watches>();
      for (const watch of watches) {
        const list = watchesByTvdbId.get(watch.tvdbShowId) ?? [];
        list.push(watch);
        watchesByTvdbId.set(watch.tvdbShowId, list);
      }

      const reportId = reportStore.create({ matched, fuzzy, unmatched, watchesByTvdbId });

      await stream.writeSSE({
        event: "complete",
        data: JSON.stringify({
          reportId,
          matched: matched.map((m) => ({
            name: m.name,
            tvdbId: m.tvdbId,
            resolved: m.externalIds,
            episodes: m.episodeCount,
            providerEpisodeCount: m.providerEpisodeCount,
            underflowDetails: m.underflowDetails,
          })),
          fuzzy: fuzzy.map((f) => ({
            name: f.name,
            candidates: f.candidates,
            episodes: f.episodeCount,
            underflowDetails: f.underflowDetails,
          })),
          unmatched: unmatched.map((u) => ({ name: u.name, episodes: u.episodeCount })),
          skippedRelics,
        }),
      });
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
      underflowDetails: UnderflowSeasonDetail[];
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
        underflowDetails: matchedShow.underflowDetails,
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
        underflowDetails: fuzzyShow.underflowDetails,
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
          const result = await importOneShow(
            library,
            providers,
            details,
            watchEvents,
            job.status,
            job.underflowDetails.length > 0,
          );
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

      library.clearStaleStoppedLists();
      reportStore.delete(body.reportId);

      await stream.writeSSE({
        event: "complete",
        data: JSON.stringify({ itemsCreated, watchesCreated, skipped }),
      });
    });
  });

  return app;
}
