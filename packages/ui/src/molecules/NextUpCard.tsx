/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SectionPill } from "../atoms/SectionPill.tsx";
import { cn } from "../lib/cn.ts";
import { EpisodeRow, type EpisodeRowProps } from "../organisms/EpisodeRow.tsx";

export type NextUpCardProps = {
  /** Translated "Next up" label. */
  title: string;
  episode: Pick<
    EpisodeRowProps,
    | "s"
    | "e"
    | "episodeTitle"
    | "stillUrl"
    | "watched"
    | "muted"
    | "airDateLabel"
    | "episodeType"
    | "finaleLabel"
    | "untitledLabel"
    | "watchCount"
    | "showRatingPrompt"
    | "myRating"
    | "ratingLabels"
    | "skipLabel"
  > & {
    checkboxDisabled?: boolean;
  };
  onToggleWatch?: () => void;
  onRate?: EpisodeRowProps["onRate"];
  onDismissPrompt?: () => void;
  footer?: ReactNode;
  className?: string;
};

/** Compact next-episode card (011 E152) — centered pill + bordered shell like web. */
export function NextUpCard({
  title,
  episode,
  onToggleWatch,
  onRate,
  onDismissPrompt,
  footer,
  className,
}: NextUpCardProps) {
  const rowProps: EpisodeRowProps = {
    embedded: true,
    align: "center",
    s: episode.s,
    e: episode.e,
    episodeTitle: episode.episodeTitle,
    stillUrl: episode.stillUrl ?? null,
    watched: episode.watched,
  };
  if (episode.muted !== undefined) rowProps.muted = episode.muted;
  if (episode.checkboxDisabled !== undefined) rowProps.checkboxDisabled = episode.checkboxDisabled;
  if (episode.airDateLabel !== undefined) rowProps.airDateLabel = episode.airDateLabel;
  if (episode.episodeType !== undefined) rowProps.episodeType = episode.episodeType;
  if (episode.finaleLabel !== undefined) rowProps.finaleLabel = episode.finaleLabel;
  if (episode.untitledLabel !== undefined) rowProps.untitledLabel = episode.untitledLabel;
  if (episode.watchCount !== undefined) rowProps.watchCount = episode.watchCount;
  if (episode.showRatingPrompt !== undefined) rowProps.showRatingPrompt = episode.showRatingPrompt;
  if (episode.myRating !== undefined) rowProps.myRating = episode.myRating;
  if (episode.ratingLabels !== undefined) rowProps.ratingLabels = episode.ratingLabels;
  if (episode.skipLabel !== undefined) rowProps.skipLabel = episode.skipLabel;
  if (onToggleWatch) rowProps.onToggleWatch = onToggleWatch;
  if (onRate) rowProps.onRate = onRate;
  if (onDismissPrompt) rowProps.onDismissPrompt = onDismissPrompt;

  return (
    <View className={cn("gap-1", className)}>
      <View className="items-center px-3 py-1">
        <SectionPill>
          <Text className="text-sm font-semibold text-snow">{title}</Text>
        </SectionPill>
      </View>
      <View className="items-center px-3">
        <View className="w-full max-w-full overflow-hidden rounded-md border border-white/10 bg-void/95">
          <EpisodeRow {...rowProps} />
        </View>
      </View>
      {footer}
    </View>
  );
}
