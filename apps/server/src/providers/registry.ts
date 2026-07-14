import { createImdbProvider } from "@baykus/provider-imdb";
import type { MetadataProvider } from "@baykus/provider-sdk";
import { createSerializdProvider } from "@baykus/provider-serializd";
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
   * M8.3/M8.4: both extra sources are single-mode-only regardless of
   * scrapersEnabled — imdb's dataset is keyless/ToS-fine but still costs
   * recurring bandwidth a hosted instance shouldn't pay by default; serializd
   * is genuine page scraping, which research.md keeps off multi mode
   * unconditionally. Keeping both gated identically also avoids a confusing
   * split under ui.md's single shared "Ek kaynakları…" checkbox.
   */
  mode?: "single" | "multi";
}

/**
 * research.md: extra sources are "opt-in via BAYKUS_ENABLE_SCRAPERS" at the
 * deployment level, on top of (not instead of) the per-library Settings
 * toggle — the env var is a floor an operator can set that the UI can't
 * silently undo, not a replacement for the UI toggle.
 */
export function effectiveScrapersEnabled(
  settingsValue: boolean,
  envValue: string | undefined,
): boolean {
  return settingsValue || envValue === "1";
}

/**
 * Ordered list of registered metadata providers: TMDB first when a key is
 * configured, TVmaze otherwise (Article IV — zero-config still works), then
 * optional extra sources (imdb, serializd) when enabled.
 */
export function createProviderRegistry(opts: ProviderRegistryOptions = {}): MetadataProvider[] {
  const providers: MetadataProvider[] = [];
  if (opts.tmdbApiKey) providers.push(createTmdbProvider({ apiKey: opts.tmdbApiKey }));
  providers.push(createTvmazeProvider());
  if (opts.scrapersEnabled && opts.dataDir && (opts.mode ?? "single") === "single") {
    providers.push(createImdbProvider({ dataDir: opts.dataDir }));
    providers.push(createSerializdProvider());
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
