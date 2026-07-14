import type { Library } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { createRateLimiter } from "./auth/rate-limit.ts";
import type { Config } from "./config.ts";
import { createAuthGate } from "./middleware/auth-gate.ts";
import { errorHandler } from "./middleware/errors.ts";
import { xBaykusGuard } from "./middleware/guard.ts";
import type { VapidKeys } from "./push/vapid.ts";
import type { AuthRouteDeps } from "./routes/auth.ts";
import { createAuthRoutes } from "./routes/auth.ts";
import { createCalendarRoute } from "./routes/calendar.ts";
import { createImageRoute } from "./routes/img.ts";
import { createLibraryRoutes } from "./routes/library.ts";
import { createPushRoutes } from "./routes/push.ts";
import { createRatingRoutes } from "./routes/ratings.ts";
import { createRefreshRoutes } from "./routes/refresh.ts";
import { createSearchRoute } from "./routes/search.ts";
import { createSettingsRoutes } from "./routes/settings.ts";
import { createStatsRoute } from "./routes/stats.ts";
import { createWatchRoutes } from "./routes/watches.ts";
import { createZipRoutes } from "./routes/zip.ts";

export interface AppDeps {
  library: Library;
  providers: MetadataProvider[];
  dataDir: string;
  vapid: VapidKeys;
  auth: AuthRouteDeps;
}

export function createApp(config: Config, deps: AppDeps) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("*", xBaykusGuard);
  app.use("*", createAuthGate(deps.auth));

  app.get("/api/health", (c) => c.json({ ok: true, mode: config.BAYKUS_MODE, version: "0.1.0" }));
  app.route(
    "/",
    createAuthRoutes(deps.auth, { claim: createRateLimiter(5), login: createRateLimiter(10) }),
  );
  app.route("/api/search", createSearchRoute(deps.providers));
  app.route("/api/library", createLibraryRoutes(deps.library, deps.providers));
  app.route("/", createWatchRoutes(deps.library));
  app.route("/", createRatingRoutes(deps.library));
  app.route("/", createStatsRoute(deps.library));
  app.route("/", createImageRoute(deps.providers, deps.dataDir));
  app.route("/", createSettingsRoutes(deps.library, deps.providers, config.BAYKUS_TMDB_API_KEY));
  app.route("/", createRefreshRoutes(deps.library, deps.providers, deps.vapid));
  app.route("/", createCalendarRoute(deps.library));
  app.route("/", createPushRoutes(deps.library, deps.vapid.publicKey));
  app.route("/", createZipRoutes(deps.library));

  // Route groups land here milestone by milestone (see specs tasks.md):
  // M7.3: per-handle library resolution (multi mode) — deps.library is
  // single-mode-only until then.

  return app;
}
