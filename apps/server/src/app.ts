import type { Library } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import type { Config } from "./config.ts";
import { errorHandler } from "./middleware/errors.ts";
import { xBaykusGuard } from "./middleware/guard.ts";
import { createLibraryRoutes } from "./routes/library.ts";
import { createRatingRoutes } from "./routes/ratings.ts";
import { createSearchRoute } from "./routes/search.ts";
import { createStatsRoute } from "./routes/stats.ts";
import { createWatchRoutes } from "./routes/watches.ts";

export interface AppDeps {
  library: Library;
  providers: MetadataProvider[];
}

export function createApp(config: Config, deps: AppDeps) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("*", xBaykusGuard);

  app.get("/api/health", (c) => c.json({ ok: true, mode: config.BAYKUS_MODE, version: "0.1.0" }));
  app.route("/api/search", createSearchRoute(deps.providers));
  app.route("/api/library", createLibraryRoutes(deps.library, deps.providers));
  app.route("/", createWatchRoutes(deps.library));
  app.route("/", createRatingRoutes(deps.library));
  app.route("/", createStatsRoute(deps.library));

  // Route groups land here milestone by milestone (see specs tasks.md):
  // M4: /img/*, settings
  // M5: /api/library/refresh (SSE), /api/calendar, /api/push
  // M6: /api/export.zip, /api/import
  // M7: /api/auth/*

  return app;
}
