import type {
  ExternalIds,
  ExternalRating,
  MetadataProvider,
  TagInfo,
  WatchProviderInfo,
} from "@baykus/provider-sdk";

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

/**
 * Same shape as enrichExternalRatings but for streaming availability. Region
 * comes from settings (default "TR"); a stale snapshot from add-time is
 * refreshed later by M5's refresh engine, never re-fetched per request.
 */
export async function enrichWatchProviders(
  providers: MetadataProvider[],
  ids: ExternalIds,
  region: string,
): Promise<WatchProviderInfo[]> {
  const capable = providers.filter((p) => p.capabilities.watchProviders && p.getWatchProviders);

  const results = await Promise.allSettled(
    capable.map((p) => p.getWatchProviders?.(ids, region) ?? Promise.resolve([])),
  );

  const merged: WatchProviderInfo[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") merged.push(...result.value);
  }
  return merged;
}

/**
 * Same shape as enrichExternalRatings but for curated tags (M8.4: only
 * serializd implements this today, and only when scrapersEnabled — which
 * is enforced by the registry never registering it otherwise, not here).
 */
export async function enrichTags(
  providers: MetadataProvider[],
  ids: ExternalIds,
): Promise<TagInfo[]> {
  const capable = providers.filter((p) => p.capabilities.tags && p.getTags);

  const results = await Promise.allSettled(
    capable.map((p) => p.getTags?.(ids) ?? Promise.resolve([])),
  );

  const tags: TagInfo[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") tags.push(...result.value);
  }
  return tags;
}
