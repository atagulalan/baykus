import type { MetadataProvider } from "@baykus/provider-sdk";
import { createTvmazeProvider } from "@baykus/provider-tvmaze";

/**
 * Ordered list of registered metadata providers: TMDB first when a key is
 * configured, TVmaze otherwise (Article IV — zero-config still works).
 * The TMDB slot is wired in M4.1; until then TVmaze is always primary.
 */
export function createProviderRegistry(): MetadataProvider[] {
  return [createTvmazeProvider()];
}
