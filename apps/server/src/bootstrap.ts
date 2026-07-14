import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createLibrary, openLibraryDb } from "@baykus/core";
import type { AppDeps } from "./app.ts";
import type { Config } from "./config.ts";
import { createProviderRegistry } from "./providers/registry.ts";

/** Real (disk-touching) dependencies for the running server. Single mode only for now — see M7. */
export function createProductionDeps(config: Config): AppDeps {
  mkdirSync(config.BAYKUS_DATA_DIR, { recursive: true });
  const { db } = openLibraryDb(join(config.BAYKUS_DATA_DIR, "library.db"));
  return {
    library: createLibrary(db),
    providers: createProviderRegistry(
      config.BAYKUS_TMDB_API_KEY ? { tmdbApiKey: config.BAYKUS_TMDB_API_KEY } : {},
    ),
    dataDir: config.BAYKUS_DATA_DIR,
  };
}
