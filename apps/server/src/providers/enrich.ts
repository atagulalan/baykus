import type { ExternalIds, ExternalRating, MetadataProvider } from "@baykus/provider-sdk";

/**
 * Calls getExternalRatings on every capable provider and merges the results.
 * A single provider failing (rate limit, auth, network) never fails the add —
 * it's just left out of the merged list.
 */
export async function enrichExternalRatings(
  providers: MetadataProvider[],
  ids: ExternalIds,
): Promise<ExternalRating[]> {
  const capable = providers.filter((p) => p.capabilities.externalRatings && p.getExternalRatings);

  const results = await Promise.allSettled(
    capable.map((p) => p.getExternalRatings?.(ids) ?? Promise.resolve([])),
  );

  const ratings: ExternalRating[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") ratings.push(...result.value);
  }
  return ratings;
}
