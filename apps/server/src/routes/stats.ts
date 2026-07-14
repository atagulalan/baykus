import type { Library } from "@baykus/core";
import { Hono } from "hono";

export function createStatsRoute(library: Library): Hono {
  const app = new Hono();
  app.get("/api/stats", (c) => c.json(library.getStats()));
  return app;
}
