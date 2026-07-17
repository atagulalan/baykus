import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../api/client.ts";
import type { EpisodeLabelFormat } from "../api/types.ts";
import { formatEpisodeLabel } from "../lib/episodeLabel.ts";

interface EpisodeLabelProps {
  s: number;
  e: number;
  className?: string;
}

/**
 * Renders a formatted season/episode identifier using the user's configured
 * format from settings (E116). Falls back to "SxEy" if settings haven't
 * loaded yet.
 */
export function EpisodeLabel({ s, e, className = "" }: EpisodeLabelProps) {
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const format: EpisodeLabelFormat = settingsQuery.data?.episodeLabelFormat ?? "SxEy";

  return (
    <span className={`font-mono text-xs tabular-nums ${className}`}>
      {formatEpisodeLabel(s, e, format)}
    </span>
  );
}
