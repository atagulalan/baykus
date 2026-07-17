import type { Library } from "@baykus/core";
import type { ExternalIds, MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "../middleware/errors.ts";

const querySchema = z
  .object({
    q: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    provider: z.string().optional(),
  })
  .strict();

const previewQuerySchema = z
  .object({
    tmdbId: z.coerce.number().int().positive().optional(),
    tvmazeId: z.coerce.number().int().positive().optional(),
    imdbId: z.string().min(1).optional(),
    tvdbId: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.tmdbId !== undefined ||
      v.tvmazeId !== undefined ||
      v.imdbId !== undefined ||
      v.tvdbId !== undefined,
    { message: "at least one external id is required" },
  );

function toExternalIds(parsed: z.infer<typeof previewQuerySchema>): ExternalIds {
  const ids: ExternalIds = {};
  if (parsed.tmdbId !== undefined) ids.tmdbId = parsed.tmdbId;
  if (parsed.tvmazeId !== undefined) ids.tvmazeId = parsed.tvmazeId;
  if (parsed.imdbId !== undefined) ids.imdbId = parsed.imdbId;
  if (parsed.tvdbId !== undefined) ids.tvdbId = parsed.tvdbId;
  return ids;
}

export function createSearchRoute(providers: MetadataProvider[], library: Library): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const parsed = querySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const provider = providers[0];
    if (!provider) throw new ApiError("INTERNAL", "no metadata providers registered");

    const results = await provider.search(parsed.q, { limit: parsed.limit ?? 10 });
    // Annotate in-library hits so the web can open without adding (009 E131).
    // In-library hits float to the top; relative order within each group is kept.
    const items = results
      .map((result) => {
        const libraryItemId = library.findItemIdByExternalIds(result.externalIds);
        return libraryItemId != null ? { ...result, libraryItemId } : { ...result };
      })
      .sort(
        (a, b) =>
          Number("libraryItemId" in b && b.libraryItemId != null) -
          Number("libraryItemId" in a && a.libraryItemId != null),
      );
    return c.json({ items, total: items.length });
  });

  /** E131: provider details for a search hit not yet in the library. */
  app.get("/preview", async (c) => {
    const parsed = previewQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const provider = providers[0];
    if (!provider) throw new ApiError("INTERNAL", "no metadata providers registered");

    const externalIds = toExternalIds(parsed);
    const libraryItemId = library.findItemIdByExternalIds(externalIds);

    const details = await provider.getSeriesDetails(externalIds);
    const year = details.firstAirDate ? Number(details.firstAirDate.slice(0, 4)) : null;

    // Synthetic episode ids: encode (s,e) so the preview UI can reuse SeasonSection
    // without library rows. Real ids are assigned only after addSeries.
    const seasons = details.seasons.map((season) => ({
      number: season.number,
      name: season.name ?? null,
      overview: season.overview ?? null,
      posterRef: season.posterRef ?? null,
      airDate: season.airDate ?? null,
      episodes: season.episodes.map((ep) => ({
        id: (ep.seasonNumber + 1) * 100_000 + ep.episodeNumber,
        s: ep.seasonNumber,
        e: ep.episodeNumber,
        title: ep.title ?? null,
        overview: ep.overview ?? null,
        airDate: ep.airDate ?? null,
        runtimeMin: ep.runtimeMin ?? null,
        stillRef: ep.stillRef ?? null,
        episodeType: ep.episodeType ?? null,
        communityRating: null,
        myRating: null,
        watchCount: 0,
        lastWatchedAt: null,
      })),
    }));

    return c.json({
      externalIds: details.externalIds,
      title: details.title,
      year: Number.isFinite(year) ? year : null,
      overview: details.overview ?? null,
      posterRef: details.posterRef ?? null,
      backdropRef: details.backdropRef ?? null,
      tagline: details.tagline ?? null,
      network: details.networks?.[0]?.name ?? null,
      genres: (details.genres ?? []).map((g) => ({
        ...(g.id !== undefined ? { id: g.id } : {}),
        name: g.name,
      })),
      releaseStatus: details.releaseStatus ?? null,
      libraryItemId,
      seasons,
    });
  });

  return app;
}
