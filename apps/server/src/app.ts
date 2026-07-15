import type { Library } from "@baykus/core";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { Hono } from "hono";
import { createLibraryProxy } from "./auth/library-context.ts";
import { createLibraryPool } from "./auth/library-pool.ts";
import { createRateLimiter } from "./auth/rate-limit.ts";
import type { Config } from "./config.ts";
import { createAuthGate } from "./middleware/auth-gate.ts";
import { errorHandler } from "./middleware/errors.ts";
import { xBaykusGuard } from "./middleware/guard.ts";
import { createLibraryResolver } from "./middleware/library-resolver.ts";
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
import { createTvTimeRoutes } from "./routes/tvtime.ts";
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

  // Every route factory below captures this proxy, never deps.library
  // directly. In single mode every call falls through to deps.library
  // unchanged; in multi mode the library-resolver middleware swaps in the
  // requesting handle's pooled Library for the duration of the request
  // (see auth/library-context.ts) — route handlers can't tell the
  // difference (Article I, M7.3).
  const contextLibrary = createLibraryProxy(deps.library);

  let onAccountDeleted: ((handle: string) => void) | undefined;
  if (deps.auth.mode === "multi") {
    const pool = createLibraryPool(deps.auth.dataDir, config.BAYKUS_MIGRATIONS_DIR);
    app.use("*", createLibraryResolver(deps.auth.accountsDb, pool));
    onAccountDeleted = (handle) => pool.close(handle);
  }

  app.get("/api/health", (c) => c.json({ ok: true, mode: config.BAYKUS_MODE, version: "0.1.0" }));
  app.route(
    "/",
    createAuthRoutes(
      deps.auth,
      { claim: createRateLimiter(5), login: createRateLimiter(10) },
      onAccountDeleted,
    ),
  );
  app.route("/api/search", createSearchRoute(deps.providers));
  app.route("/api/library", createLibraryRoutes(contextLibrary, deps.providers));
  app.route("/", createWatchRoutes(contextLibrary));
  app.route("/", createRatingRoutes(contextLibrary));
  app.route("/", createStatsRoute(contextLibrary));
  app.route("/", createImageRoute(deps.providers, deps.dataDir));
  app.route(
    "/",
    createSettingsRoutes(
      contextLibrary,
      deps.providers,
      config.BAYKUS_TMDB_API_KEY,
      deps.dataDir,
      config.BAYKUS_MODE,
      config.BAYKUS_ENABLE_SCRAPERS,
    ),
  );
  app.route("/", createRefreshRoutes(contextLibrary, deps.providers, deps.vapid));
  app.route("/", createCalendarRoute(contextLibrary));
  app.route("/", createPushRoutes(contextLibrary, deps.vapid));
  app.route("/", createZipRoutes(contextLibrary));
  app.route("/", createTvTimeRoutes(contextLibrary, deps.providers));

  return app;
}
