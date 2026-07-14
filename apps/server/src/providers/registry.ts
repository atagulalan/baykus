import type { MetadataProvider } from "@baykus/provider-sdk";
import { createTmdbProvider } from "@baykus/provider-tmdb";
import { createTvmazeProvider } from "@baykus/provider-tvmaze";

export interface ProviderRegistryOptions {
  /** Single-mode env var today; per-request settings-driven override lands in M4.4. */
  tmdbApiKey?: string;
}

/**
 * Ordered list of registered metadata providers: TMDB first when a key is
 * configured, TVmaze otherwise (Article IV — zero-config still works).
 */
export function createProviderRegistry(opts: ProviderRegistryOptions = {}): MetadataProvider[] {
  const providers: MetadataProvider[] = [];
  if (opts.tmdbApiKey) providers.push(createTmdbProvider({ apiKey: opts.tmdbApiKey }));
  providers.push(createTvmazeProvider());
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
