import type { EpisodeLabelFormat } from "../../../api/types.ts";
import { formatEpisodeLabel } from "../../../lib/episodeLabel.ts";

interface EpisodeLabelProps {
  s: number;
  e: number;
  format: EpisodeLabelFormat;
  className?: string;
}

/** Renders a formatted season/episode identifier (E116). */
export function EpisodeLabel({ s, e, format, className = "" }: EpisodeLabelProps) {
  return (
    <span className={`font-mono text-xs tabular-nums ${className}`}>
      {formatEpisodeLabel(s, e, format)}
    </span>
  );
}
