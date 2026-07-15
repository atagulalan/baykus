/** E52: canonical form for an item — TMDB id when known, else the internal-id fallback. */
export function seriesParam(series: { id: number; tmdbId: number | null }): string {
  return series.tmdbId != null ? String(series.tmdbId) : `i${series.id}`;
}

export type ParsedSeriesParam =
  | { kind: "tmdb"; id: number }
  | { kind: "internal"; id: number }
  | { kind: "invalid" };

/** E52: bare digits -> TMDB id (Serializd parity); `i`-prefixed -> internal id; anything else -> invalid. */
export function parseSeriesParam(param: string): ParsedSeriesParam {
  if (/^\d+$/.test(param)) {
    const id = Number(param);
    return id > 0 ? { kind: "tmdb", id } : { kind: "invalid" };
  }
  if (/^i\d+$/.test(param)) {
    const id = Number(param.slice(1));
    return id > 0 ? { kind: "internal", id } : { kind: "invalid" };
  }
  return { kind: "invalid" };
}
