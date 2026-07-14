import type {
  EpisodePosition,
  ExternalIds,
  MetadataProvider,
  SearchResult,
  SeriesDetails,
} from "@baykus/provider-sdk";
import type { TvTimeShow, TvTimeStatus, TvTimeWatchEvent } from "./parse.ts";
import { titleSimilarity } from "./similarity.ts";

/** research.md: "below threshold → unmatched bucket for manual resolution". */
const CONFIDENCE_THRESHOLD = 0.85;
const MAX_CANDIDATES = 5;
/** Parallel show resolves — shared provider rate limiters still serialize bursts. */
const MATCH_CONCURRENCY = 8;

export interface MatchedShow {
  name: string;
  tvdbId: number;
  externalIds: ExternalIds;
  /** Full season/episode inventory — confirm reuses this (no second provider fetch). */
  details: SeriesDetails;
  episodeCount: number;
  status: TvTimeStatus;
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
  status: TvTimeStatus;
}

export interface UnmatchedShow {
  name: string;
  tvdbId: number;
  episodeCount: number;
  status: TvTimeStatus;
}

export interface MatchReport {
  matched: MatchedShow[];
  fuzzy: FuzzyShow[];
  unmatched: UnmatchedShow[];
}

type ShowOutcome =
  | { kind: "matched"; show: MatchedShow }
  | { kind: "fuzzy"; show: FuzzyShow }
  | { kind: "unmatched"; show: UnmatchedShow };

function episodeCountFor(tvdbId: number, watches: TvTimeWatchEvent[]): number {
  return watches.filter((w) => w.tvdbShowId === tvdbId).length;
}

/** Providers that can supply full series inventory (skip rating-only extras). */
function detailsProviders(providers: MetadataProvider[]): MetadataProvider[] {
  return providers.filter((p) => p.capabilities.details);
}

/** tvdbId → full getSeriesDetails — first provider to resolve it wins. */
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

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next++;
      const item = items[index];
      if (index >= items.length || item === undefined) return;
      results[index] = await fn(item);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function matchOneShow(
  show: TvTimeShow,
  watches: TvTimeWatchEvent[],
  providers: MetadataProvider[],
): Promise<ShowOutcome> {
  const episodeCount = episodeCountFor(show.tvdbId, watches);
  const status = show.status ?? "watching";

  const tvdbDetails = await tryTvdbLookup(providers, show.tvdbId);
  if (tvdbDetails) {
    return {
      kind: "matched",
      show: {
        name: show.name,
        tvdbId: show.tvdbId,
        externalIds: tvdbDetails.externalIds,
        details: tvdbDetails,
        episodeCount,
        status,
      },
    };
  }

  const byName = await resolveByName(providers, show.name);
  if (byName && "details" in byName) {
    return {
      kind: "matched",
      show: {
        name: show.name,
        tvdbId: show.tvdbId,
        externalIds: byName.details.externalIds,
        details: byName.details,
        episodeCount,
        status,
      },
    };
  }
  if (byName && "candidates" in byName && byName.candidates.length > 0) {
    return {
      kind: "fuzzy",
      show: {
        name: show.name,
        tvdbId: show.tvdbId,
        candidates: byName.candidates,
        episodeCount,
        status,
      },
    };
  }
  return {
    kind: "unmatched",
    show: { name: show.name, tvdbId: show.tvdbId, episodeCount, status },
  };
}

/**
 * contracts/api.md §tvtime. Fetches full SeriesDetails during the report phase
 * (safer: confirm reuses inventory; watch s/e resolution only needs what's
 * already cached). Episode *watch* events are not resolved yet — that stays
 * at confirm via resolveEpisodePosition / CSV positions.
 *
 * Shows are resolved with bounded concurrency; provider rate limiters still
 * apply (TMDB ~30/s after bulk-import tuning; TVmaze keeps its hard 20/10s).
 */
export async function matchShows(
  shows: TvTimeShow[],
  watches: TvTimeWatchEvent[],
  providers: MetadataProvider[],
): Promise<MatchReport> {
  const eligible = detailsProviders(providers);
  const outcomes = await mapPool(shows, MATCH_CONCURRENCY, (show) =>
    matchOneShow(show, watches, eligible),
  );

  const matched: MatchedShow[] = [];
  const fuzzy: FuzzyShow[] = [];
  const unmatched: UnmatchedShow[] = [];
  for (const outcome of outcomes) {
    if (outcome.kind === "matched") matched.push(outcome.show);
    else if (outcome.kind === "fuzzy") fuzzy.push(outcome.show);
    else unmatched.push(outcome.show);
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
