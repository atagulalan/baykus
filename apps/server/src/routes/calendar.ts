import type { Library } from "@baykus/core";
import { Hono } from "hono";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const querySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .strict();

/** contracts/api.md §Calendar. */
export function createCalendarRoute(library: Library): Hono {
  const app = new Hono();

  app.get("/api/calendar", (c) => {
    const query = querySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const opts: { from?: string; to?: string } = {};
    if (query.from !== undefined) opts.from = query.from;
    if (query.to !== undefined) opts.to = query.to;
    return c.json(library.getCalendar(opts));
  });

  return app;
}
