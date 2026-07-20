import { isEpisodeAired } from "./airing.ts";

/** E37: numeric seasons ascending, Specials (season 0) last. Presentation-only — core/zip season ordering untouched. */
export function sortSeasonsSpecialsLast<T extends { number: number }>(seasons: T[]): T[] {
  return [...seasons].sort((a, b) => {
    if (a.number === 0) return 1;
    if (b.number === 0) return -1;
    return a.number - b.number;
  });
}

type SeasonWithEpisodes = {
  number: number;
  episodes: { watchCount: number; airDate: string | null; airStamp?: string | null | undefined }[];
};

/** Aired catch-up — green ring without check when unaired remain (E180). */
export function isSeasonComplete(season: SeasonWithEpisodes): boolean {
  const aired = season.episodes.filter((episode) => isEpisodeAired(episode));
  if (aired.length === 0) return false;
  return aired.every((episode) => episode.watchCount > 0);
}

/**
 * Green-check finished: caught up on aired and no announced unaired left.
 * Check-less green caught-up seasons are complete but not finished (E180 / E176).
 */
export function isSeasonFinished(season: SeasonWithEpisodes): boolean {
  if (season.episodes.length === 0) return false;
  return isSeasonComplete(season) && season.episodes.every((episode) => isEpisodeAired(episode));
}

/**
 * Minimum fully-watched seasons before the active season required before
 * collapsing them behind a gap control (E165). A single prior season stays listed.
 */
export const COMPLETED_SEASON_COLLAPSE_MIN = 2;

export type SeasonListEntry<T> =
  | { kind: "season"; season: T }
  | { kind: "gap"; seasons: T[]; gapKey: string };

/**
 * E165: collapse fully-watched numbered seasons before the active (first
 * incomplete) season into one gap entry when that prefix is at least
 * {@link COMPLETED_SEASON_COLLAPSE_MIN} long. Specials (0) never join the
 * prefix. When every numbered season is complete, the last stays visible as
 * the anchor. Gaps in `expandedGapKeys` expand back into season entries.
 */
export function collapseCompletedSeasonRuns<T extends { number: number }>(
  seasons: T[],
  isComplete: (season: T) => boolean,
  expandedGapKeys: ReadonlySet<string> = new Set(),
): SeasonListEntry<T>[] {
  const numbered = seasons.filter((s) => s.number !== 0);
  const specials = seasons.filter((s) => s.number === 0);
  const out: SeasonListEntry<T>[] = [];

  if (numbered.length === 0) {
    for (const s of specials) out.push({ kind: "season", season: s });
    return out;
  }

  let activeIdx = numbered.findIndex((s) => !isComplete(s));
  if (activeIdx === -1) {
    activeIdx = numbered.length - 1;
  }

  const prefix = numbered.slice(0, activeIdx);
  const rest = numbered.slice(activeIdx);

  if (prefix.length >= COMPLETED_SEASON_COLLAPSE_MIN) {
    const first = prefix[0];
    const last = prefix[prefix.length - 1];
    const gapKey = `gap:${first?.number}-${last?.number}`;
    if (expandedGapKeys.has(gapKey)) {
      for (const s of prefix) out.push({ kind: "season", season: s });
    } else {
      out.push({ kind: "gap", seasons: prefix, gapKey });
    }
  } else {
    for (const s of prefix) out.push({ kind: "season", season: s });
  }

  for (const s of rest) out.push({ kind: "season", season: s });
  for (const s of specials) out.push({ kind: "season", season: s });
  return out;
}

/** E176: default open season — numbered season holding nextUnwatched; Specials never auto-open. */
export function defaultExpandedSeasonNumber(
  nextUnwatched: { s: number; e: number } | null,
): number | null {
  if (nextUnwatched === null || nextUnwatched.s === 0) return null;
  return nextUnwatched.s;
}

/** E176: after a season is fully watched, open the next incomplete numbered season if any. */
export function nextIncompleteSeasonAfter(
  seasons: SeasonWithEpisodes[],
  afterSeasonNumber: number,
): number | null {
  const sorted = sortSeasonsSpecialsLast(seasons);
  const startIndex = sorted.findIndex((season) => season.number === afterSeasonNumber);
  if (startIndex === -1) return null;

  for (let index = startIndex + 1; index < sorted.length; index++) {
    const season = sorted[index];
    if (!season || season.number === 0) continue;
    const aired = season.episodes.filter((episode) => isEpisodeAired(episode));
    if (aired.length === 0) continue;
    if (!isSeasonComplete(season)) return season.number;
  }

  return null;
}

/** Snapshot of green-check finished state — drives E176 auto-advance only. */
export function seasonCompleteSnapshot(seasons: SeasonWithEpisodes[]): Map<number, boolean> {
  const snapshot = new Map<number, boolean>();
  for (const season of seasons) {
    snapshot.set(season.number, isSeasonFinished(season));
  }
  return snapshot;
}

/**
 * E176: auto-advance only when the *open* season flips to green-check finished
 * (not blue aired catch-up). Manually expanding an already-finished season must
 * stay open. Returns the next expanded season number, or `undefined` when
 * nothing should change.
 */
export function autoAdvanceIfSeasonJustCompleted(
  seasons: SeasonWithEpisodes[],
  expandedSeasonNumber: number | null,
  previousComplete: ReadonlyMap<number, boolean>,
): number | null | undefined {
  if (expandedSeasonNumber === null) return undefined;

  const season = seasons.find((entry) => entry.number === expandedSeasonNumber);
  if (!season) return undefined;

  const nowFinished = isSeasonFinished(season);
  const wasTracked = previousComplete.has(expandedSeasonNumber);
  const wasFinished = previousComplete.get(expandedSeasonNumber) === true;

  if (!nowFinished || !wasTracked || wasFinished) return undefined;
  return nextIncompleteSeasonAfter(seasons, expandedSeasonNumber);
}
