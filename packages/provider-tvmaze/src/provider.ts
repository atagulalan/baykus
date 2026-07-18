import {
  createRateLimiter,
  type ExternalIds,
  fetchJson,
  type ImageRef,
  type ImageSize,
  type MetadataProvider,
  ProviderError,
  type SearchOptions,
  type SearchResult,
  type SeriesDetails,
} from "@baykus/provider-sdk";
import {
  mapSearchResults,
  mapSeriesDetails,
  resolveTvmazeImageUrl,
  type TvmazeSearchEntry,
  type TvmazeShow,
} from "./mapping.ts";

const BASE_URL = "https://api.tvmaze.com";
const PROVIDER_ID = "tvmaze";

// TVmaze's 20 req/10s cap is per IP — shared across every provider instance in the process.
const limiter = createRateLimiter({ tokens: 20, perMs: 10_000 });

async function get<T>(path: string): Promise<T> {
  return fetchJson<T>(`${BASE_URL}${path}`, {}, { providerId: PROVIDER_ID, limiter });
}

async function resolveShowId(ref: ExternalIds): Promise<number> {
  if (ref.tvmazeId) return ref.tvmazeId;
  if (ref.imdbId) {
    const show = await get<TvmazeShow>(`/lookup/shows?imdb=${encodeURIComponent(ref.imdbId)}`);
    return show.id;
  }
  if (ref.tvdbId) {
    const show = await get<TvmazeShow>(`/lookup/shows?thetvdb=${ref.tvdbId}`);
    return show.id;
  }
  throw new ProviderError(
    PROVIDER_ID,
    "UNSUPPORTED",
    "no usable external id (need tvmazeId, imdbId or tvdbId)",
  );
}

export function createTvmazeProvider(): MetadataProvider {
  return {
    id: PROVIDER_ID,
    mediaTypes: ["series"],
    capabilities: {
      search: true,
      details: true,
      upcoming: true,
      watchProviders: false,
      externalRatings: false,
      tags: false,
      images: true,
      credits: false,
    },
    requiresApiKey: false,

    async search(query: string, opts?: SearchOptions): Promise<SearchResult[]> {
      const limit = opts?.limit ?? 10;
      const entries = await get<TvmazeSearchEntry[]>(
        `/search/shows?q=${encodeURIComponent(query)}`,
      );
      return mapSearchResults(entries).slice(0, limit);
    },

    async getSeriesDetails(ref: ExternalIds): Promise<SeriesDetails> {
      const showId = await resolveShowId(ref);
      const show = await get<TvmazeShow>(`/shows/${showId}?embed[]=episodes&embed[]=images`);
      return mapSeriesDetails(show);
    },

    resolveImageUrl(ref: ImageRef, size: ImageSize): string {
      return resolveTvmazeImageUrl(ref, size);
    },
  };
}
