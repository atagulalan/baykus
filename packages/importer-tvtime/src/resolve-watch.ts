import type { EpisodePosition, MetadataProvider, SeriesDetails } from "@baykus/provider-sdk";
import { resolveEpisodePosition } from "./match.ts";

export interface WatchResolveInput {
  tvdbEpisodeId: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface WatchResolveContext {
  episodeIdByPosition: ReadonlyMap<string, number>;
  airedOrder: readonly EpisodePosition[];
  tvdbOrderMap: ReadonlyMap<number, EpisodePosition>;
  providers: MetadataProvider[];
  providerCache: Map<number, EpisodePosition | null>;
}

function positionKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}-${episodeNumber}`;
}

/** Non-special episodes from provider inventory, in airing order (E3 plain-date sort). */
export function buildAiredEpisodeOrder(details: SeriesDetails): EpisodePosition[] {
  const episodes: { position: EpisodePosition; airDate: string }[] = [];
  for (const season of details.seasons) {
    for (const ep of season.episodes) {
      if (ep.seasonNumber === 0) continue;
      episodes.push({
        position: { seasonNumber: ep.seasonNumber, episodeNumber: ep.episodeNumber },
        airDate: ep.airDate ?? "9999-99-99",
      });
    }
  }
  episodes.sort((a, b) => {
    if (a.airDate !== b.airDate) return a.airDate < b.airDate ? -1 : 1;
    if (a.position.seasonNumber !== b.position.seasonNumber) {
      return a.position.seasonNumber - b.position.seasonNumber;
    }
    return a.position.episodeNumber - b.position.episodeNumber;
  });
  return episodes.map((e) => e.position);
}

/**
 * Maps each unique TVDB episode id (ascending — TVDB assigns ids in creation
 * order, which tracks chronological episode order) to the same-index slot in
 * the provider's airing-ordered inventory. Used when TV Time's own season/
 * episode numbers disagree with the resolved provider (common for split-cour
 * anime and La Casa de Papel-style part numbering) and no TMDB key is
 * available to resolve the bare tvdb episode id.
 *
 * Season-level bulk marks (episode_number=0) and specials (season 0) are
 * excluded — they carry their own tvdb ids but are not real episodes, and
 * including them would shift the whole map (confirmed on Money Heist export).
 */
export function buildTvdbAiringOrderMap(
  watches: readonly WatchResolveInput[],
  airedOrder: readonly EpisodePosition[],
): Map<number, EpisodePosition> {
  const episodeWatches = watches.filter(
    (w) => w.episodeNumber !== undefined && w.episodeNumber !== 0,
  );
  const uniqueEpisodeTvdbIds = [...new Set(episodeWatches.map((w) => w.tvdbEpisodeId))].sort(
    (a, b) => a - b,
  );
  const map = new Map<number, EpisodePosition>();
  for (let i = 0; i < uniqueEpisodeTvdbIds.length && i < airedOrder.length; i++) {
    const tvdbId = uniqueEpisodeTvdbIds[i];
    const position = airedOrder[i];
    if (tvdbId !== undefined && position !== undefined) map.set(tvdbId, position);
  }

  // Season/part bulk marks (episode_number=0) carry their own TVDB ids. When
  // they are not also present as normal episode rows, assign the remaining
  // airing-order tail — confirmed on Saiki K. (9 bulk-only ids → slots 56–64).
  const bulkOnlyIds = [
    ...new Set(
      watches
        .filter((w) => w.episodeNumber === 0)
        .map((w) => w.tvdbEpisodeId)
        .filter((id) => !map.has(id)),
    ),
  ].sort((a, b) => a - b);
  let nextIndex = uniqueEpisodeTvdbIds.length;
  for (const tvdbId of bulkOnlyIds) {
    const position = airedOrder[nextIndex];
    if (position === undefined) break;
    map.set(tvdbId, position);
    nextIndex++;
  }

  return map;
}

export function createWatchResolveContext(
  details: SeriesDetails,
  watches: readonly WatchResolveInput[],
  episodeIdByPosition: ReadonlyMap<string, number>,
  providers: MetadataProvider[],
): WatchResolveContext {
  const airedOrder = buildAiredEpisodeOrder(details);
  return {
    episodeIdByPosition,
    airedOrder,
    tvdbOrderMap: buildTvdbAiringOrderMap(watches, airedOrder),
    providers,
    providerCache: new Map(),
  };
}

function positionInInventory(
  position: EpisodePosition,
  episodeIdByPosition: ReadonlyMap<string, number>,
): boolean {
  return episodeIdByPosition.has(positionKey(position.seasonNumber, position.episodeNumber));
}

/**
 * Resolves one TV Time watch row to a (season, episode) position in the
 * provider inventory. Precedence:
 * 1. Provider findEpisodeByTvdbId (TMDB) when available.
 * 2. TVDB-id airing-order map when TV Time's season label diverges from the
 *    provider's — even if a misleading CSV slot exists (Money Heist parts).
 * 3. CSV season/episode when that slot exists in inventory.
 * 4. TVDB-id airing-order map as a last resort (NieR-style drift within CSV).
 */
export async function resolveWatchPosition(
  watch: WatchResolveInput,
  ctx: WatchResolveContext,
): Promise<EpisodePosition | null> {
  const mapped = ctx.tvdbOrderMap.get(watch.tvdbEpisodeId) ?? null;
  const mappedOk = mapped !== null && positionInInventory(mapped, ctx.episodeIdByPosition);

  let direct: EpisodePosition | null = null;
  if (
    watch.seasonNumber !== undefined &&
    watch.episodeNumber !== undefined &&
    watch.episodeNumber !== 0
  ) {
    const candidate: EpisodePosition = {
      seasonNumber: watch.seasonNumber,
      episodeNumber: watch.episodeNumber,
    };
    if (positionInInventory(candidate, ctx.episodeIdByPosition)) direct = candidate;
  }

  if (!ctx.providerCache.has(watch.tvdbEpisodeId)) {
    const providerPos = await resolveEpisodePosition(ctx.providers, watch.tvdbEpisodeId);
    ctx.providerCache.set(watch.tvdbEpisodeId, providerPos);
  }
  const providerPos = ctx.providerCache.get(watch.tvdbEpisodeId) ?? null;
  if (providerPos && positionInInventory(providerPos, ctx.episodeIdByPosition)) {
    return providerPos;
  }

  if (mappedOk && watch.seasonNumber !== undefined && mapped.seasonNumber !== watch.seasonNumber) {
    return mapped;
  }

  if (direct) return direct;

  if (mappedOk) return mapped;

  return null;
}
