import type { Library, RatingTargetType } from "@baykus/core";
import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "../middleware/errors.ts";

const targetTypeSchema = z.enum(["item", "episode"]);

const putRatingSchema = z
  .object({
    targetType: targetTypeSchema,
    targetId: z.number().int(),
    value: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .strict();

function parseTargetType(raw: string): RatingTargetType {
  const result = targetTypeSchema.safeParse(raw);
  if (!result.success) throw new ApiError("NOT_FOUND", `invalid target type "${raw}"`);
  return result.data;
}

function parseTargetId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) throw new ApiError("NOT_FOUND", `invalid target id "${raw}"`);
  return id;
}

export function createRatingRoutes(library: Library): Hono {
  const app = new Hono();

  app.put("/api/ratings", async (c) => {
    const body = putRatingSchema.parse(await c.req.json());
    const rating = library.setRating(body.targetType, body.targetId, body.value);
    return c.json(rating);
  });

  app.delete("/api/ratings/:targetType/:targetId", (c) => {
    const targetType = parseTargetType(c.req.param("targetType"));
    const targetId = parseTargetId(c.req.param("targetId"));
    if (!library.clearRating(targetType, targetId)) {
      throw new ApiError("NOT_FOUND", `no rating for ${targetType} ${targetId}`);
    }
    return c.body(null, 204);
  });

  return app;
}
