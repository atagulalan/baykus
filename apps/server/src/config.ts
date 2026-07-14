import { z } from "zod";

const envSchema = z.object({
  BAYKUS_MODE: z.enum(["single", "multi"]).default("single"),
  BAYKUS_DATA_DIR: z.string().default("./data"),
  BAYKUS_PASSWORD: z.string().optional(),
  BAYKUS_TMDB_API_KEY: z.string().optional(),
  BAYKUS_ENABLE_SCRAPERS: z.enum(["0", "1"]).default("0"),
  /** Multi mode only — single mode generates+persists its own keypair on first boot. */
  BAYKUS_VAPID_PUBLIC_KEY: z.string().optional(),
  BAYKUS_VAPID_PRIVATE_KEY: z.string().optional(),
  PORT: z.coerce.number().int().default(4004),
  /**
   * Set only by the Docker image's entrypoint. packages/core's migrations
   * folder is normally computed relative to its own source file — correct
   * everywhere except after apps/server's esbuild bundle inlines that code
   * (import.meta.url then points at dist/main.js). Left unset, openLibraryDb
   * falls back to its own default, matching dev/test behavior exactly.
   */
  BAYKUS_MIGRATIONS_DIR: z.string().optional(),
  /** Set only by the Docker image's entrypoint — the built web SPA, served statically with an index.html SPA fallback. Unset (dev/tests): no static serving, Vite serves apps/web separately. */
  BAYKUS_WEB_DIST: z.string().optional(),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return envSchema.parse(env);
}
