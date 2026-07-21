export type SeasonProgressEntry = {
  number: number;
  watched: number;
  total: number;
  announced: number;
};

export type SeasonProgress = {
  sequential: boolean;
  seasons: SeasonProgressEntry[];
};

export type Segment =
  | { kind: "filled" }
  | { kind: "frontier"; percent: number }
  | { kind: "hollow" };

const MAX_SEGMENTED_SEASONS = 12;

/**
 * M43: when the frontier season is 0% watched (and not the first segment),
 * paint this many px of fill so the bar isn't fully invisible.
 * `0` disables the sliver.
 */
export const EMPTY_FRONTIER_MIN_PX = 0;

/** Width for a frontier fill — percent, or `EMPTY_FRONTIER_MIN_PX` when applicable. */
export function frontierFillWidth(
  percent: number,
  segmentIndex: number,
): { unit: "px"; value: number } | { unit: "%"; value: number } {
  if (percent === 0 && segmentIndex > 0 && EMPTY_FRONTIER_MIN_PX > 0) {
    return { unit: "px", value: EMPTY_FRONTIER_MIN_PX };
  }
  return { unit: "%", value: percent };
}

/** E34: null means fall back to plain percentage bar. */
export function buildProgressSegments(sp: SeasonProgress): Segment[] | null {
  if (!sp.sequential) return null;
  const { seasons } = sp;
  if (seasons.length < 1 || seasons.length > MAX_SEGMENTED_SEASONS) return null;

  const frontierIndex = seasons.findIndex((s) => s.watched < s.total);
  return seasons.map((s, i) => {
    if (frontierIndex === -1 || i < frontierIndex) return { kind: "filled" };
    if (i === frontierIndex) {
      const percent = s.total > 0 ? Math.round((s.watched / s.total) * 100) : 0;
      return { kind: "frontier", percent };
    }
    return { kind: "hollow" };
  });
}

/** E180: aired done, unaired remain. */
export function isCaughtUpWaiting(entry: {
  watched: number;
  total: number;
  announced: number;
}): boolean {
  return entry.total > 0 && entry.watched >= entry.total && entry.announced > entry.total;
}

/**
 * Prefer announced counts from season episode lists so hero beads match
 * accordion rings (web `alignSeasonProgressAnnounced`).
 */
export function alignSeasonProgressAnnounced(
  seasonProgress: SeasonProgress,
  seasons: Array<{ number: number; episodes: readonly unknown[] }>,
): SeasonProgress {
  const announcedByNumber = new Map(
    seasons.filter((s) => s.number !== 0).map((s) => [s.number, s.episodes.length]),
  );
  return {
    ...seasonProgress,
    seasons: seasonProgress.seasons.map((entry) => ({
      ...entry,
      announced: announcedByNumber.get(entry.number) ?? entry.announced ?? entry.total,
    })),
  };
}
