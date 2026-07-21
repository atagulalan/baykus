/// <reference types="nativewind/types" />
import { Text } from "react-native";
import { cn } from "../lib/cn.ts";
import { type EpisodeLabelFormat, formatEpisodeLabel } from "../lib/episodeLabel.ts";

export type EpisodeLabelProps = {
  s: number;
  e: number;
  format: EpisodeLabelFormat;
  className?: string;
};

/** Renders a formatted season/episode identifier (E116). */
export function EpisodeLabel({ s, e, format, className }: EpisodeLabelProps) {
  return (
    <Text className={cn("font-mono text-xs tabular-nums", className)}>
      {formatEpisodeLabel(s, e, format)}
    </Text>
  );
}
