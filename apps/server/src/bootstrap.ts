import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createLibrary, openLibraryDb } from "@baykus/core";
import type { AppDeps } from "./app.ts";
import type { Config } from "./config.ts";
import { createProviderRegistry } from "./providers/registry.ts";
import { loadOrCreateVapidKeys, type VapidKeys } from "./push/vapid.ts";

/** Real (disk-touching) dependencies for the running server. Single mode only for now — see M7. */
export function createProductionDeps(config: Config): AppDeps {
  mkdirSync(config.BAYKUS_DATA_DIR, { recursive: true });
  const { db } = openLibraryDb(join(config.BAYKUS_DATA_DIR, "library.db"));
  const library = createLibrary(db);
  const tmdbApiKey = library.getTmdbApiKey() ?? config.BAYKUS_TMDB_API_KEY;

  const envVapidKeys: VapidKeys | undefined =
    config.BAYKUS_VAPID_PUBLIC_KEY && config.BAYKUS_VAPID_PRIVATE_KEY
      ? { publicKey: config.BAYKUS_VAPID_PUBLIC_KEY, privateKey: config.BAYKUS_VAPID_PRIVATE_KEY }
      : undefined;

  return {
    library,
    providers: createProviderRegistry(tmdbApiKey ? { tmdbApiKey } : {}),
    dataDir: config.BAYKUS_DATA_DIR,
    vapid: loadOrCreateVapidKeys(config.BAYKUS_DATA_DIR, envVapidKeys),
  };
}
