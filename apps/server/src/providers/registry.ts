import { createImdbProvider } from "@baykus/provider-imdb";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { createTmdbProvider } from "@baykus/provider-tmdb";
import { createTvmazeProvider } from "@baykus/provider-tvmaze";

export interface ProviderRegistryOptions {
  /** Single-mode env var today; per-request settings-driven override lands in M4.4. */
  tmdbApiKey?: string;
  /** Settings' shared "extra sources" toggle (ui.md: "IMDb, Serializd etkinleştir"). */
  scrapersEnabled?: boolean;
  /** Required when scrapersEnabled — imdb caches its dataset under <dataDir>/imdb. */
  dataDir?: string;
  /**
   * M8.3: imdb's dataset is keyless and ToS-fine (not scraping a live page),
   * but multi mode keeps it off unconditionally regardless of scrapersEnabled
   * — a hosted instance shouldn't pay the recurring ~25MB/day bandwidth for
   * every handle by default.
   */
  mode?: "single" | "multi";
}

/**
 * Ordered list of registered metadata providers: TMDB first when a key is
 * configured, TVmaze otherwise (Article IV — zero-config still works), then
 * optional extra sources (imdb; serializd lands in M8.4) when enabled.
 */
export function createProviderRegistry(opts: ProviderRegistryOptions = {}): MetadataProvider[] {
  const providers: MetadataProvider[] = [];
  if (opts.tmdbApiKey) providers.push(createTmdbProvider({ apiKey: opts.tmdbApiKey }));
  providers.push(createTvmazeProvider());
  if (opts.scrapersEnabled && opts.dataDir && (opts.mode ?? "single") === "single") {
    providers.push(createImdbProvider({ dataDir: opts.dataDir }));
  }
  return providers;
}

/**
 * Replaces `target`'s contents in place (same array reference) so every route
 * factory that already closed over it — search, library, img — observes the
 * change on their very next request. Used when a Settings save changes the
 * TMDB key, so it takes effect without a server restart.
 */
export function refreshProviders(
  target: MetadataProvider[],
  opts: ProviderRegistryOptions = {},
): void {
  target.splice(0, target.length, ...createProviderRegistry(opts));
}
