import type {
  ExternalIds,
  ExternalRating,
  ImageRef,
  ImageSize,
  MetadataProvider,
  SearchOptions,
  SearchResult,
  SeriesDetails,
  TagInfo,
} from "@baykus/provider-sdk";
import { ProviderError } from "@baykus/provider-sdk";
import {
  extractNextData,
  mapExternalRatings,
  mapTags,
  parseShowData,
  type ShowData,
} from "./parse.ts";

const PROVIDER_ID = "serializd";
const BASE_URL = "https://www.serializd.com";
/** Serializd blocks non-browser requests; the trailing slug is cosmetic (verified: /show/94997 alone resolves the same show as /show/House-of-the-Dragon-94997). */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * __NEXT_DATA__ scraper, keyed by tmdbId (Serializd's own show ids ARE tmdb
 * ids — verified against fixtures/README's reference show). externalRatings
 * + tags only (FR-018); disabled by default, single-mode-only, gated behind
 * the shared scrapersEnabled setting at the registry level (see
 * apps/server/src/providers/registry.ts) — this is genuine page scraping,
 * unlike provider-imdb's ToS-fine bulk dataset.
 */
export function createSerializdProvider(): MetadataProvider {
  async function fetchShowData(tmdbId: number): Promise<ShowData> {
    const res = await fetch(`${BASE_URL}/show/${tmdbId}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      const code = res.status === 404 ? "NOT_FOUND" : "NETWORK";
      throw new ProviderError(PROVIDER_ID, code, `serializd fetch failed: HTTP ${res.status}`);
    }
    const html = await res.text();
    return parseShowData(extractNextData(html));
  }

  return {
    id: PROVIDER_ID,
    mediaTypes: ["series"],
    capabilities: {
      search: false,
      details: false,
      upcoming: false,
      watchProviders: false,
      externalRatings: true,
      tags: true,
      images: false,
    },
    requiresApiKey: false,

    async search(_query: string, _opts?: SearchOptions): Promise<SearchResult[]> {
      throw new ProviderError(PROVIDER_ID, "UNSUPPORTED", "serializd provider is scrape-only");
    },

    async getSeriesDetails(_ref: ExternalIds): Promise<SeriesDetails> {
      throw new ProviderError(PROVIDER_ID, "UNSUPPORTED", "serializd provider is scrape-only");
    },

    async getExternalRatings(ref: ExternalIds): Promise<ExternalRating[]> {
      if (!ref.tmdbId) return [];
      const data = await fetchShowData(ref.tmdbId);
      return mapExternalRatings(data);
    },

    async getTags(ref: ExternalIds): Promise<TagInfo[]> {
      if (!ref.tmdbId) return [];
      const data = await fetchShowData(ref.tmdbId);
      return mapTags(data);
    },

    resolveImageUrl(_ref: ImageRef, _size: ImageSize): string {
      throw new ProviderError(PROVIDER_ID, "UNSUPPORTED", "serializd provider serves no images");
    },
  };
}
