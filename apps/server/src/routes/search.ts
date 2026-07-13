import type { MetadataProvider } from "@baykus/provider-sdk";
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

export function createSearchRoute(providers: MetadataProvider[]): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const parsed = querySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const provider = providers[0];
    if (!provider) throw new ApiError("INTERNAL", "no metadata providers registered");

    const results = await provider.search(parsed.q, { limit: parsed.limit ?? 10 });
    return c.json({ items: results, total: results.length });
  });

  return app;
}
