import {
  createRateLimiter,
  type ExternalIds,
  type ExternalRating,
  fetchJson,
  type ImageRef,
  type ImageSize,
  type MetadataProvider,
  ProviderError,
  type SearchOptions,
  type SearchResult,
  type SeriesDetails,
  type WatchProviderInfo,
} from "@baykus/provider-sdk";
import {
  mapSearchResults,
  mapSeriesDetails,
  mapWatchProviders,
  resolveTmdbImageUrl,
  type TmdbSearchResponse,
  type TmdbSeasonDetails,
  type TmdbSeriesDetails,
  type TmdbWatchProvidersResponse,
} from "./mapping.ts";

const BASE_URL = "https://api.themoviedb.org/3";
const PROVIDER_ID = "tmdb";

// Self-imposed 4 req/s cap for the season fan-out in getSeriesDetails, well under TMDB's ~50 req/s soft limit.
const limiter = createRateLimiter({ tokens: 4, perMs: 1000 });

/** v3 keys are 32-char hex API keys (query param); v4 read tokens are long JWT-like bearer strings. */
function isV4Token(apiKey: string): boolean {
  return apiKey.length > 40;
}

interface TmdbFindResponse {
  tv_results: { id: number }[];
}

export function createTmdbProvider(opts: { apiKey: string }): MetadataProvider {
  const { apiKey } = opts;
  const v4 = isV4Token(apiKey);

  async function get<T>(path: string): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const url = v4 ? `${BASE_URL}${path}` : `${BASE_URL}${path}${separator}api_key=${apiKey}`;
    const init: RequestInit = v4 ? { headers: { Authorization: `Bearer ${apiKey}` } } : {};
    return fetchJson<T>(url, init, { providerId: PROVIDER_ID, limiter });
  }

  async function resolveShowId(ref: ExternalIds): Promise<number> {
    if (ref.tmdbId) return ref.tmdbId;
    if (ref.imdbId) {
      const found = await get<TmdbFindResponse>(`/find/${ref.imdbId}?external_source=imdb_id`);
      const hit = found.tv_results[0];
      if (!hit) throw new ProviderError(PROVIDER_ID, "NOT_FOUND", `no tv match for ${ref.imdbId}`);
      return hit.id;
    }
    throw new ProviderError(
      PROVIDER_ID,
      "UNSUPPORTED",
      "no usable external id (need tmdbId or imdbId)",
    );
  }

  return {
    id: PROVIDER_ID,
    mediaTypes: ["series"],
    capabilities: {
      search: true,
      details: true,
      upcoming: true,
      watchProviders: true,
      externalRatings: true,
      tags: false,
      images: true,
    },
    requiresApiKey: true,

    async search(query: string, opts?: SearchOptions): Promise<SearchResult[]> {
      const limit = opts?.limit ?? 10;
      const response = await get<TmdbSearchResponse>(
        `/search/tv?query=${encodeURIComponent(query)}`,
      );
      return mapSearchResults(response).slice(0, limit);
    },

    async getSeriesDetails(ref: ExternalIds): Promise<SeriesDetails> {
      const id = await resolveShowId(ref);
      const details = await get<TmdbSeriesDetails>(
        `/tv/${id}?append_to_response=external_ids,content_ratings`,
      );
      const seasonNumbers = (details.seasons ?? []).map((s) => s.season_number);
      const seasons = await Promise.all(
        seasonNumbers.map((n) => get<TmdbSeasonDetails>(`/tv/${id}/season/${n}`)),
      );
      return mapSeriesDetails(details, seasons);
    },

    async getWatchProviders(ref: ExternalIds, region: string): Promise<WatchProviderInfo[]> {
      const id = await resolveShowId(ref);
      const response = await get<TmdbWatchProvidersResponse>(`/tv/${id}/watch/providers`);
      return mapWatchProviders(response, region);
    },

    async getExternalRatings(ref: ExternalIds): Promise<ExternalRating[]> {
      const id = await resolveShowId(ref);
      const details = await get<{ vote_average?: number; vote_count?: number }>(`/tv/${id}`);
      if (!details.vote_average || !details.vote_count) return [];
      return [
        {
          source: PROVIDER_ID,
          value: details.vote_average,
          scale: 10,
          votes: details.vote_count,
          fetchedAt: new Date().toISOString(),
        },
      ];
    },

    resolveImageUrl(ref: ImageRef, size: ImageSize): string {
      return resolveTmdbImageUrl(ref, size);
    },
  };
}
