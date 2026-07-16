import type { Library } from "@baykus/core";
import { Hono } from "hono";
import { z } from "zod";

const querySchema = z.object({ tz: z.string().optional() }).strict();

/** E96: invalid or absent tz is never an error — falls back to UTC. */
function resolveTz(tz: string | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** contracts/api.md §stats (008 delta — ?tz=<IANA>, additive fields, E96). */
export function createStatsRoute(library: Library): Hono {
  const app = new Hono();
  app.get("/api/stats", (c) => {
    const query = querySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    return c.json(library.getStats(resolveTz(query.tz)));
  });
  return app;
}
