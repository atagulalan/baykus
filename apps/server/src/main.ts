import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { createProductionDeps } from "./bootstrap.ts";
import { loadConfig } from "./config.ts";
import { initSentry } from "./observability/sentry.ts";

const config = loadConfig();
initSentry(config);
const app = createApp(config, createProductionDeps(config));

/**
 * M9.1: the Docker image bundles the built web SPA alongside the server and
 * serves it directly — no separate web server needed. Falls back to
 * index.html for any unmatched non-API path so client-side routes (e.g.
 * /series/42) survive a hard refresh; /api/* and /img/* still 404 as JSON.
 * Only activates when BAYKUS_WEB_DIST is set (the Docker entrypoint), so
 * `pnpm dev` (Vite serves apps/web separately) is unaffected. serveStatic's
 * `root`/`path` are resolved relative to cwd — absolute paths aren't
 * supported — hence the relative() conversion.
 */
if (config.BAYKUS_WEB_DIST && existsSync(config.BAYKUS_WEB_DIST)) {
  const webDistDir = relative(process.cwd(), config.BAYKUS_WEB_DIST);
  const indexHtml = readFileSync(join(config.BAYKUS_WEB_DIST, "index.html"), "utf-8");

  app.use("*", serveStatic({ root: webDistDir }));
  app.notFound((c) => {
    if (c.req.path.startsWith("/api/") || c.req.path.startsWith("/img/")) {
      return c.json({ error: { code: "NOT_FOUND", message: "not found", details: null } }, 404);
    }
    return c.html(indexHtml);
  });
}

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`baykuş server (${config.BAYKUS_MODE} mode) → http://localhost:${info.port}`);
});
