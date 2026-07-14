import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createLibrary, openLibraryDb } from "@baykus/core";
import type { AppDeps } from "./app.ts";
import { openAccountsDb } from "./auth/accounts.ts";
import { createSingleSessionStore } from "./auth/single-session.ts";
import type { Config } from "./config.ts";
import { createProviderRegistry } from "./providers/registry.ts";
import { loadOrCreateVapidKeys, type VapidKeys } from "./push/vapid.ts";

/** Real (disk-touching) dependencies for the running server, single or multi mode. */
export function createProductionDeps(config: Config): AppDeps {
  mkdirSync(config.BAYKUS_DATA_DIR, { recursive: true });

  // Single mode's one-and-only library, or multi mode's unused fallback
  // (createLibraryProxy() only ever falls back to this outside of a
  // resolved request — every real multi-mode request swaps in the
  // requesting handle's pooled library instead, see app.ts).
  const library =
    config.BAYKUS_MODE === "single"
      ? createLibrary(openLibraryDb(join(config.BAYKUS_DATA_DIR, "library.db")).db)
      : createLibrary(openLibraryDb(":memory:").db);

  const tmdbApiKey = config.BAYKUS_MODE === "single" ? library.getTmdbApiKey() : undefined;
  const activeTmdbKey = tmdbApiKey ?? config.BAYKUS_TMDB_API_KEY;

  const envVapidKeys: VapidKeys | undefined =
    config.BAYKUS_VAPID_PUBLIC_KEY && config.BAYKUS_VAPID_PRIVATE_KEY
      ? { publicKey: config.BAYKUS_VAPID_PUBLIC_KEY, privateKey: config.BAYKUS_VAPID_PRIVATE_KEY }
      : undefined;

  return {
    library,
    providers: createProviderRegistry({
      ...(activeTmdbKey ? { tmdbApiKey: activeTmdbKey } : {}),
      scrapersEnabled: library.getSettings().scrapersEnabled,
      dataDir: config.BAYKUS_DATA_DIR,
      mode: config.BAYKUS_MODE,
    }),
    dataDir: config.BAYKUS_DATA_DIR,
    vapid: loadOrCreateVapidKeys(config.BAYKUS_DATA_DIR, envVapidKeys),
    auth:
      config.BAYKUS_MODE === "multi"
        ? {
            mode: "multi",
            accountsDb: openAccountsDb(join(config.BAYKUS_DATA_DIR, "accounts.db")),
            dataDir: config.BAYKUS_DATA_DIR,
          }
        : {
            mode: "single",
            password: config.BAYKUS_PASSWORD,
            singleSessions: createSingleSessionStore(),
          },
  };
}
