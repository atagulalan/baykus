/**
 * Pure formatter for season/episode identifiers (E116).
 * Keep in sync with `@baykus/api-client` `formatEpisodeLabel`.
 */

export type EpisodeLabelFormat = "SxEy" | "S01E06" | "compact";

export function formatEpisodeLabel(s: number, e: number, format: EpisodeLabelFormat): string {
  switch (format) {
    case "S01E06":
      return `S${String(s).padStart(2, "0")}E${String(e).padStart(2, "0")}`;
    case "compact":
      return `${s}×${e}`;
    default:
      return `S${s}E${e}`;
  }
}
