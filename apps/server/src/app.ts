import { Hono } from "hono";
import type { Config } from "./config.ts";

export function createApp(config: Config) {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ ok: true, mode: config.BAYKUS_MODE, version: "0.1.0" }));

  // Route groups land here milestone by milestone (see specs tasks.md):
  // M1: /api/search, /api/library/series
  // M2: /api/episodes/:id/watches, bulk watches
  // M3: /api/ratings
  // M4: /img/*, settings
  // M5: /api/library/refresh (SSE), /api/calendar, /api/push
  // M6: /api/export.zip, /api/import
  // M7: /api/auth/*

  return app;
}
