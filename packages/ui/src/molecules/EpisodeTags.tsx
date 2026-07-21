/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import {
  computeEpisodeTagKinds,
  type EpisodeTagKind,
  type EpisodeTagsInput,
  TAG_BORDERS,
  TAG_STYLES,
  TAG_TEXT,
} from "../lib/episodeTags.ts";

export type EpisodeTagsProps = EpisodeTagsInput & {
  /** Localized chip labels keyed by kind. */
  labels: Record<EpisodeTagKind, string>;
};

const TAG_CHIP_BASE = "shrink-0 items-center justify-center rounded-full px-2 py-0.5";

/** Shared by calendar rows and watch lists. */
export function EpisodeTags(props: EpisodeTagsProps) {
  const { labels, excludeTags, ...input } = props;
  let kinds = computeEpisodeTagKinds(input);
  if (excludeTags) {
    kinds = kinds.filter((k) => !excludeTags.includes(k));
  }
  if (kinds.length === 0) return null;

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {kinds.map((kind) => {
        const label = labels[kind];
        return (
          <View
            key={kind}
            className={cn(TAG_CHIP_BASE, TAG_STYLES[kind])}
            style={TAG_BORDERS[kind]}
          >
            <Text className={cn("font-mono text-[9px] uppercase tracking-wide", TAG_TEXT[kind])}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
