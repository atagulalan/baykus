import type {
  EpisodePosition,
  ExternalIds,
  MetadataProvider,
  SearchResult,
  SeriesDetails,
} from "@baykus/provider-sdk";
import type { TvTimeShow, TvTimeWatchEvent } from "./parse.ts";
import { titleSimilarity } from "./similarity.ts";

/** research.md: "below threshold → unmatched bucket for manual resolution". */
const CONFIDENCE_THRESHOLD = 0.85;
const MAX_CANDIDATES = 5;

export interface MatchedShow {
  name: string;
  tvdbId: number;
  externalIds: ExternalIds;
  details: SeriesDetails;
  episodeCount: number;
}

export interface FuzzyCandidate {
  externalIds: ExternalIds;
  title: string;
  year?: number;
}

export interface FuzzyShow {
  name: string;
  tvdbId: number;
  candidates: FuzzyCandidate[];
  episodeCount: number;
}

export interface UnmatchedShow {
  name: string;
  tvdbId: number;
  episodeCount: number;
}

export interface MatchReport {
  matched: MatchedShow[];
  fuzzy: FuzzyShow[];
  unmatched: UnmatchedShow[];
}

function episodeCountFor(tvdbId: number, watches: TvTimeWatchEvent[]): number {
  return watches.filter((w) => w.tvdbShowId === tvdbId).length;
}

/** tvdbId → (tvmaze lookup, tmdb find when key) — first provider to resolve it wins. */
async function tryTvdbLookup(
  providers: MetadataProvider[],
  tvdbId: number,
): Promise<SeriesDetails | null> {
  for (const provider of providers) {
    try {
      return await provider.getSeriesDetails({ tvdbId });
    } catch {
      // try the next provider
    }
  }
  return null;
}

interface NameMatchHit {
  details: SeriesDetails;
}
interface NameMatchCandidates {
  candidates: FuzzyCandidate[];
}

async function resolveByName(
  providers: MetadataProvider[],
  showName: string,
): Promise<NameMatchHit | NameMatchCandidates | null> {
  const allResults: SearchResult[] = [];
  for (const provider of providers) {
    try {
      allResults.push(...(await provider.search(showName, { limit: MAX_CANDIDATES })));
    } catch {
      // try the next provider
    }
  }
  if (allResults.length === 0) return null;

  const scored = allResults
    .map((result) => ({ result, score: titleSimilarity(showName, result.title) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best && best.score >= CONFIDENCE_THRESHOLD) {
    const provider = providers.find((p) => p.id === best.result.providerId);
    if (provider) {
      try {
        const details = await provider.getSeriesDetails(best.result.externalIds);
        return { details };
      } catch {
        // fall through to the fuzzy candidate list below
      }
    }
  }

  const candidates: FuzzyCandidate[] = scored.slice(0, MAX_CANDIDATES).map(({ result }) => {
    const candidate: FuzzyCandidate = { externalIds: result.externalIds, title: result.title };
    if (result.year !== undefined) candidate.year = result.year;
    return candidate;
  });
  return { candidates };
}

/**
 * contracts/api.md §tvtime. Report only needs episode *counts* per show
 * (not per-episode resolution, which is deferred to confirm-time via
 * resolveEpisodePosition — resolving every watched episode up front would
 * be wasted work if the user never confirms).
 */
export async function matchShows(
  shows: TvTimeShow[],
  watches: TvTimeWatchEvent[],
  providers: MetadataProvider[],
): Promise<MatchReport> {
  const matched: MatchedShow[] = [];
  const fuzzy: FuzzyShow[] = [];
  const unmatched: UnmatchedShow[] = [];

  for (const show of shows) {
    const episodeCount = episodeCountFor(show.tvdbId, watches);

    const tvdbDetails = await tryTvdbLookup(providers, show.tvdbId);
    if (tvdbDetails) {
      matched.push({
        name: show.name,
        tvdbId: show.tvdbId,
        externalIds: tvdbDetails.externalIds,
        details: tvdbDetails,
        episodeCount,
      });
      continue;
    }

    const byName = await resolveByName(providers, show.name);
    if (byName && "details" in byName) {
      matched.push({
        name: show.name,
        tvdbId: show.tvdbId,
        externalIds: byName.details.externalIds,
        details: byName.details,
        episodeCount,
      });
    } else if (byName && "candidates" in byName && byName.candidates.length > 0) {
      fuzzy.push({
        name: show.name,
        tvdbId: show.tvdbId,
        candidates: byName.candidates,
        episodeCount,
      });
    } else {
      unmatched.push({ name: show.name, tvdbId: show.tvdbId, episodeCount });
    }
  }

  return { matched, fuzzy, unmatched };
}

/**
 * TV Time's watch rows only carry TheTVDB's own numeric episode id, never
 * season/episode numbers — TMDB is the only provider capable of resolving
 * one (via /find?external_source=tvdb_id on the episode id itself). Used
 * at confirm-time, per matched/resolved show.
 */
export async function resolveEpisodePosition(
  providers: MetadataProvider[],
  tvdbEpisodeId: number,
): Promise<EpisodePosition | null> {
  for (const provider of providers) {
    if (!provider.findEpisodeByTvdbId) continue;
    try {
      const position = await provider.findEpisodeByTvdbId(tvdbEpisodeId);
      if (position) return position;
    } catch {
      // try the next provider
    }
  }
  return null;
}
