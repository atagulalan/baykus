import type { EpisodeLabelFormat } from "./types.ts";

/**
 * Pure formatter for season/episode identifiers (E116).
 *
 * - `"SxEy"`    → `S1E6`  (default, compact, no zero-padding)
 * - `"S01E06"`  → `S01E06` (zero-padded to 2+ digits)
 * - `"compact"` → `1×6`   (minimal, with × separator)
 */
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
