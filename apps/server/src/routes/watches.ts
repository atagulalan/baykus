import type { Library } from "@baykus/core";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { ApiError } from "../middleware/errors.ts";

const addWatchBodySchema = z.object({ watchedAt: z.string().optional() }).strict();

const historyQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const bulkWatchBodySchema = z
  .object({
    upToEpisodeId: z.number().int().optional(),
    seasonNumber: z.number().int().optional(),
  })
  .strict()
  .refine((body) => (body.upToEpisodeId !== undefined) !== (body.seasonNumber !== undefined), {
    message: "exactly one of upToEpisodeId or seasonNumber is required",
  });

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) throw new ApiError("NOT_FOUND", `invalid id "${raw}"`);
  return id;
}

/** Tolerates a missing/empty body — both watch endpoints treat "no body" as "{}". */
async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

export function createWatchRoutes(library: Library): Hono {
  const app = new Hono();

  app.post("/api/episodes/:id/watches", async (c) => {
    const episodeId = parseId(c.req.param("id"));
    const body = addWatchBodySchema.parse(await readJsonBody(c));

    const result = library.addWatch(episodeId, body.watchedAt);
    if (!result) throw new ApiError("NOT_FOUND", `episode ${episodeId} not in library`);

    const { created, ...payload } = result;
    return c.json(payload, created ? 201 : 200);
  });

  app.delete("/api/episodes/:id/watches/latest", (c) => {
    const episodeId = parseId(c.req.param("id"));
    if (!library.removeLatestWatch(episodeId)) {
      throw new ApiError("NOT_FOUND", `no watch to remove for episode ${episodeId}`);
    }
    return c.body(null, 204);
  });

  app.post("/api/library/series/:id/watches/bulk", async (c) => {
    const itemId = parseId(c.req.param("id"));
    const body = bulkWatchBodySchema.parse(await readJsonBody(c));
    const target =
      body.upToEpisodeId !== undefined
        ? { upToEpisodeId: body.upToEpisodeId }
        : { seasonNumber: body.seasonNumber as number };

    const result = library.bulkWatch(itemId, target);
    if (!result) {
      throw new ApiError("NOT_FOUND", `series ${itemId} (or target episode) not in library`);
    }
    return c.json(result);
  });

  app.delete("/api/library/series/:id/watches/bulk", async (c) => {
    const itemId = parseId(c.req.param("id"));
    const body = bulkWatchBodySchema.parse(await readJsonBody(c));
    const target =
      body.upToEpisodeId !== undefined
        ? { upToEpisodeId: body.upToEpisodeId }
        : { seasonNumber: body.seasonNumber as number };

    const result = library.bulkUnwatch(itemId, target);
    if (!result) {
      throw new ApiError("NOT_FOUND", `series ${itemId} (or target episode) not in library`);
    }
    return c.json(result);
  });

  app.get("/api/watches/history", (c) => {
    const query = historyQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const items = library.getWatchHistory(query.limit ?? 30);
    return c.json({ items, total: items.length });
  });

  return app;
}
