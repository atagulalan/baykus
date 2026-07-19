import type { ExternalIds, MetadataProvider, SeriesDetails } from "@baykus/provider-sdk";

/**
 * Merges TVMaze `airstamp` values onto a primary provider's episode inventory
 * (TMDB dates only). Failures are swallowed — add/refresh must not break.
 */
export async function enrichAirStamps(
  details: SeriesDetails,
  tvmazeProvider: MetadataProvider,
): Promise<SeriesDetails> {
  try {
    const tvmazeDetails = await tvmazeProvider.getSeriesDetails(details.externalIds);
    const stampByKey = new Map<string, string>();
    for (const season of tvmazeDetails.seasons) {
      for (const ep of season.episodes) {
        if (ep.airStamp) stampByKey.set(`${ep.seasonNumber}:${ep.episodeNumber}`, ep.airStamp);
      }
    }
    if (stampByKey.size === 0) return details;

    return {
      ...details,
      seasons: details.seasons.map((season) => ({
        ...season,
        episodes: season.episodes.map((ep) => {
          const stamp = stampByKey.get(`${ep.seasonNumber}:${ep.episodeNumber}`);
          return stamp ? { ...ep, airStamp: stamp } : ep;
        }),
      })),
    };
  } catch {
    return details;
  }
}

/** Primary metadata provider with TVMaze air-stamp enrichment when available. */
export function createDetailsProvider(providers: MetadataProvider[]): MetadataProvider | null {
  const primary = providers[0];
  if (!primary) return null;
  const tvmaze = providers.find((p) => p.id === "tvmaze");
  if (!tvmaze || primary.id === "tvmaze") return primary;

  return {
    ...primary,
    async getSeriesDetails(ref: ExternalIds): Promise<SeriesDetails> {
      const details = await primary.getSeriesDetails(ref);
      return enrichAirStamps(details, tvmaze);
    },
  };
}
