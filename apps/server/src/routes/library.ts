import type { Library, ListSeriesOptions, TrackingPatch } from "@baykus/core";
import type { ExternalIds, MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "../middleware/errors.ts";

const externalIdsSchema = z
  .object({
    tmdbId: z.number().int().optional(),
    tvmazeId: z.number().int().optional(),
    imdbId: z.string().optional(),
    tvdbId: z.number().int().optional(),
  })
  .strict();

const statusSchema = z.enum(["watching", "plan_to_watch", "completed", "dropped", "paused"]);

const addSeriesSchema = z
  .object({
    externalIds: externalIdsSchema,
    status: statusSchema.optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    status: statusSchema.optional(),
    sort: z.enum(["title", "added", "rating", "nextAir"]).optional(),
  })
  .strict();

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) throw new ApiError("NOT_FOUND", `invalid id "${raw}"`);
  return id;
}

// zod's `.optional()` types the field as `T | undefined` (always present); the
// DTOs it feeds use genuinely-optional keys (`exactOptionalPropertyTypes`), so
// undefined values must be dropped rather than passed through.
function toExternalIds(parsed: z.infer<typeof externalIdsSchema>): ExternalIds {
  const ids: ExternalIds = {};
  if (parsed.tmdbId !== undefined) ids.tmdbId = parsed.tmdbId;
  if (parsed.tvmazeId !== undefined) ids.tvmazeId = parsed.tvmazeId;
  if (parsed.imdbId !== undefined) ids.imdbId = parsed.imdbId;
  if (parsed.tvdbId !== undefined) ids.tvdbId = parsed.tvdbId;
  return ids;
}

function toListOptions(parsed: z.infer<typeof listQuerySchema>): ListSeriesOptions {
  const opts: ListSeriesOptions = {};
  if (parsed.status !== undefined) opts.status = parsed.status;
  if (parsed.sort !== undefined) opts.sort = parsed.sort;
  return opts;
}

const updateSeriesSchema = z
  .object({
    status: statusSchema.optional(),
    pushMuted: z.boolean().optional(),
    note: z.string().nullable().optional(),
  })
  .strict();

function toTrackingPatch(parsed: z.infer<typeof updateSeriesSchema>): TrackingPatch {
  const patch: TrackingPatch = {};
  if (parsed.status !== undefined) patch.status = parsed.status;
  if (parsed.pushMuted !== undefined) patch.pushMuted = parsed.pushMuted;
  if (parsed.note !== undefined) patch.note = parsed.note;
  return patch;
}

export function createLibraryRoutes(library: Library, providers: MetadataProvider[]): Hono {
  const app = new Hono();

  app.post("/series", async (c) => {
    const body = addSeriesSchema.parse(await c.req.json());
    const provider = providers[0];
    if (!provider) throw new ApiError("INTERNAL", "no metadata providers registered");

    const details = await provider.getSeriesDetails(toExternalIds(body.externalIds));
    const summary = library.addSeries(details, body.status ?? "watching");
    return c.json(summary, 201);
  });

  app.get("/series", (c) => {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    return c.json(library.listSeries(toListOptions(query)));
  });

  app.get("/series/:id", (c) => {
    const id = parseId(c.req.param("id"));
    const detail = library.getSeries(id);
    if (!detail) throw new ApiError("NOT_FOUND", `series ${id} not in library`);
    return c.json(detail);
  });

  app.patch("/series/:id", async (c) => {
    const id = parseId(c.req.param("id"));
    const body = updateSeriesSchema.parse(await c.req.json());
    const summary = library.updateTracking(id, toTrackingPatch(body));
    if (!summary) throw new ApiError("NOT_FOUND", `series ${id} not in library`);
    return c.json(summary);
  });

  app.delete("/series/:id", (c) => {
    const id = parseId(c.req.param("id"));
    if (!library.removeSeries(id)) throw new ApiError("NOT_FOUND", `series ${id} not in library`);
    return c.body(null, 204);
  });

  return app;
}
