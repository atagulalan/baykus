import {
  type CastMember,
  createRateLimiter,
  type EpisodePosition,
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
  mapCredits,
  mapSearchResults,
  mapSeriesDetails,
  mapWatchProviders,
  resolveTmdbImageUrl,
  type TmdbCreditsResponse,
  type TmdbSearchResponse,
  type TmdbSeasonDetails,
  type TmdbSeriesDetails,
  type TmdbWatchProvidersResponse,
} from "./mapping.ts";

const BASE_URL = "https://api.themoviedb.org/3";
const PROVIDER_ID = "tmdb";

// Bulk-friendly cap (~30 req/s, headroom under TMDB's ~50 req/s soft ceiling).
// The old 4/s self-throttle made TV Time matching stall at ~0.5-1s/show under
// TMDB-first; fetchJson retries 429s, but a lower cap means fewer to retry.
const limiter = createRateLimiter({ tokens: 30, perMs: 1000 });

/** v3 keys are 32-char hex API keys (query param); v4 read tokens are long JWT-like bearer strings. */
function isV4Token(apiKey: string): boolean {
  return apiKey.length > 40;
}

interface TmdbFindResponse {
  tv_results: { id: number }[];
  tv_episode_results: { season_number: number; episode_number: number }[];
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
    if (ref.tvdbId) {
      const found = await get<TmdbFindResponse>(`/find/${ref.tvdbId}?external_source=tvdb_id`);
      const hit = found.tv_results[0];
      if (!hit)
        throw new ProviderError(PROVIDER_ID, "NOT_FOUND", `no tv match for tvdb:${ref.tvdbId}`);
      return hit.id;
    }
    throw new ProviderError(
      PROVIDER_ID,
      "UNSUPPORTED",
      "no usable external id (need tmdbId, imdbId or tvdbId)",
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
      credits: true,
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

    async getCredits(ref: ExternalIds): Promise<CastMember[]> {
      const id = await resolveShowId(ref);
      const response = await get<TmdbCreditsResponse>(`/tv/${id}/credits`);
      return mapCredits(response);
    },

    async findEpisodeByTvdbId(tvdbEpisodeId: number): Promise<EpisodePosition | null> {
      const found = await get<TmdbFindResponse>(`/find/${tvdbEpisodeId}?external_source=tvdb_id`);
      const hit = found.tv_episode_results[0];
      if (!hit) return null;
      return { seasonNumber: hit.season_number, episodeNumber: hit.episode_number };
    },

    resolveImageUrl(ref: ImageRef, size: ImageSize): string {
      return resolveTmdbImageUrl(ref, size);
    },
  };
}
