import type {
  ExternalIds,
  ExternalRating,
  ImageRef,
  ImageSize,
  MetadataProvider,
  SearchOptions,
  SearchResult,
  SeriesDetails,
} from "@baykus/provider-sdk";
import { ProviderError } from "@baykus/provider-sdk";
import { createRatingsIndex } from "./datasets.ts";

const PROVIDER_ID = "imdb";

/**
 * IMDb non-commercial datasets client — externalRatings only (FR-018). Never
 * used for search/getSeriesDetails (capabilities flags both false; the
 * registry never routes to them, see enrichExternalRatings), so those throw
 * rather than carrying real logic no caller ever exercises.
 */
export function createImdbProvider(opts: { dataDir: string }): MetadataProvider {
  const ratings = createRatingsIndex(opts.dataDir);

  return {
    id: PROVIDER_ID,
    mediaTypes: ["series", "movie"],
    capabilities: {
      search: false,
      details: false,
      upcoming: false,
      watchProviders: false,
      externalRatings: true,
      tags: false,
      images: false,
    },
    requiresApiKey: false,

    async search(_query: string, _opts?: SearchOptions): Promise<SearchResult[]> {
      throw new ProviderError(PROVIDER_ID, "UNSUPPORTED", "imdb provider is externalRatings-only");
    },

    async getSeriesDetails(_ref: ExternalIds): Promise<SeriesDetails> {
      throw new ProviderError(PROVIDER_ID, "UNSUPPORTED", "imdb provider is externalRatings-only");
    },

    async getExternalRatings(ref: ExternalIds): Promise<ExternalRating[]> {
      if (!ref.imdbId) return [];
      const hit = await ratings.get(ref.imdbId);
      if (!hit) return [];
      return [
        {
          source: PROVIDER_ID,
          value: hit.rating,
          scale: 10,
          votes: hit.votes,
          fetchedAt: new Date().toISOString(),
        },
      ];
    },

    resolveImageUrl(_ref: ImageRef, _size: ImageSize): string {
      throw new ProviderError(PROVIDER_ID, "UNSUPPORTED", "imdb provider serves no images");
    },
  };
}
