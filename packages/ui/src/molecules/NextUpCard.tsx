/// <reference types="nativewind/types" />
import type { ReactNode, Ref } from "react";
import { Text, View } from "react-native";
import { SectionPill } from "../atoms/SectionPill.tsx";
import { borders } from "../lib/borders.ts";
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
    | "trailing"
  > & {
    checkboxDisabled?: boolean;
  };
  onToggleWatch?: () => void;
  /** Title / still press — open episode details (series detail). */
  onPress?: () => void;
  onRate?: EpisodeRowProps["onRate"];
  onDismissPrompt?: () => void;
  /** Watch control wrapper — tablet ActionSheet popover anchor. */
  watchControlRef?: Ref<View>;
  footer?: ReactNode;
  className?: string;
};

/** Compact next-episode card (011 E152) — centered pill + bordered shell like web. */
export function NextUpCard({
  title,
  episode,
  onToggleWatch,
  onPress,
  onRate,
  onDismissPrompt,
  watchControlRef,
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
  if (episode.trailing !== undefined) rowProps.trailing = episode.trailing;
  if (onToggleWatch) rowProps.onToggleWatch = onToggleWatch;
  if (onPress) rowProps.onPress = onPress;
  if (onRate) rowProps.onRate = onRate;
  if (onDismissPrompt) rowProps.onDismissPrompt = onDismissPrompt;
  if (watchControlRef) rowProps.watchControlRef = watchControlRef;

  return (
    <View className={cn("gap-1", className)}>
      <View className="items-center px-3 py-1">
        <SectionPill>
          <Text className="px-2.5 py-1 text-sm font-semibold text-snow">{title}</Text>
        </SectionPill>
      </View>
      <View className="items-center px-3">
        {/* w-auto hugs short titles (web NextUpCard); min-w-0 + shrink lets
            long ones compress so EpisodeRow truncation can take over (RN
            defaults flexShrink to 0, unlike web). */}
        <View
          className="w-auto min-w-0 max-w-full shrink overflow-hidden rounded-md bg-void/95"
          style={borders.subtle}
        >
          <EpisodeRow {...rowProps} />
        </View>
      </View>
      {footer}
    </View>
  );
}
