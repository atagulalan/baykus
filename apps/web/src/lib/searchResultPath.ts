import type { ExternalIds, SearchResult } from "../api/types.ts";

/** Build `/series/new?…` query from whatever external ids the hit carries. */
export function previewSearchQuery(ids: ExternalIds): string {
  const params = new URLSearchParams();
  if (ids.tmdbId != null) params.set("tmdbId", String(ids.tmdbId));
  if (ids.tvmazeId != null) params.set("tvmazeId", String(ids.tvmazeId));
  if (ids.imdbId) params.set("imdbId", ids.imdbId);
  if (ids.tvdbId != null) params.set("tvdbId", String(ids.tvdbId));
  return params.toString();
}

/**
 * E154 / E131: same-tab and new-tab destination for a search hit.
 * In-library → `/series/i{id}`; otherwise preview with external-id query.
 */
export function searchResultPath(result: SearchResult): string {
  if (result.libraryItemId != null) {
    return `/series/i${result.libraryItemId}`;
  }
  const query = previewSearchQuery(result.externalIds);
  return query ? `/series/new?${query}` : "/series/new";
}
