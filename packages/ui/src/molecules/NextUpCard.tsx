/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SectionPill } from "../atoms/SectionPill.tsx";
import { cn } from "../lib/cn.ts";
import { EpisodeRow, type EpisodeRowProps } from "../organisms/EpisodeRow.tsx";

export type NextUpCardProps = {
  /** Translated "Next up" label. */
  title: string;
  episode: Pick<EpisodeRowProps, "s" | "e" | "episodeTitle" | "stillUrl" | "watched" | "muted"> & {
    checkboxDisabled?: boolean;
  };
  onToggleWatch?: () => void;
  footer?: ReactNode;
  className?: string;
};

/** Compact next-episode card (011 E152) — menus/rating prompt stay in app shells. */
export function NextUpCard({ title, episode, onToggleWatch, footer, className }: NextUpCardProps) {
  return (
    <View className={cn("gap-1", className)}>
      <View className="items-center py-1">
        <SectionPill>
          <Text className="text-sm font-semibold text-snow">{title}</Text>
        </SectionPill>
      </View>
      <View className="overflow-hidden rounded-md border border-white/10 bg-void/95">
        <EpisodeRow
          s={episode.s}
          e={episode.e}
          episodeTitle={episode.episodeTitle}
          stillUrl={episode.stillUrl ?? null}
          watched={episode.watched}
          {...(episode.muted !== undefined ? { muted: episode.muted } : {})}
          {...(episode.checkboxDisabled !== undefined
            ? { checkboxDisabled: episode.checkboxDisabled }
            : {})}
          {...(onToggleWatch ? { onToggleWatch } : {})}
        />
      </View>
      {footer}
    </View>
  );
}
