import type { Library } from "@baykus/core";
import { Hono } from "hono";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MAX_RANGE_DAYS = 124;

const querySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .strict()
  .refine((q) => q.from === undefined || q.to === undefined || q.from <= q.to, {
    message: "from must be on or before to",
    path: ["from"],
  })
  .refine(
    (q) => {
      if (q.from === undefined || q.to === undefined) return true;
      const days = (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000;
      return days <= MAX_RANGE_DAYS;
    },
    { message: `range must not exceed ${MAX_RANGE_DAYS} days`, path: ["to"] },
  );

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
