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
