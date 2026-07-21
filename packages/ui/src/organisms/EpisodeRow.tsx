/// <reference types="nativewind/types" />
import { Pressable, Text, View } from "react-native";
import { Checkbox } from "../atoms/Checkbox.tsx";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { cn } from "../lib/cn.ts";
import type { EpisodeLabelFormat } from "../lib/episodeLabel.ts";
import { EpisodeTags, type EpisodeTagsProps } from "../molecules/EpisodeTags.tsx";

export type EpisodeRowProps = {
  s: number;
  e: number;
  episodeTitle: string | null;
  stillUrl?: string | null;
  labelFormat?: EpisodeLabelFormat;
  watched: boolean;
  muted?: boolean;
  checkboxDisabled?: boolean;
  onToggleWatch?: () => void;
  tags?: Omit<EpisodeTagsProps, "s" | "e"> | null;
  onPress?: () => void;
  className?: string;
};

/**
 * Compact episode list row for calendar / watch / series detail.
 * Full web EpisodeRow (menus, rating prompt, overview fetch) comes later.
 */
export function EpisodeRow({
  s,
  e,
  episodeTitle,
  stillUrl,
  labelFormat = "SxEy",
  watched,
  muted = false,
  checkboxDisabled = false,
  onToggleWatch,
  tags,
  onPress,
  className,
}: EpisodeRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        "min-w-0 flex-row items-stretch gap-0 py-2 pl-3 pr-3",
        muted && "opacity-50",
        className,
      )}
    >
      <View className="min-h-14 w-12 shrink-0 self-stretch overflow-hidden rounded-md bg-white/5">
        {stillUrl ? (
          <MediaImage
            src={stillUrl}
            {...(episodeTitle ? { accessibilityLabel: episodeTitle } : {})}
            wrapperClassName="h-full w-full"
            className="h-full w-full"
          />
        ) : null}
      </View>
      <View className="min-w-0 flex-1 justify-center gap-1 py-2 pl-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <EpisodeLabel s={s} e={e} format={labelFormat} className="text-muted" />
          {tags ? <EpisodeTags s={s} e={e} {...tags} /> : null}
        </View>
        {episodeTitle ? (
          <Text numberOfLines={1} className="text-sm text-snow">
            {episodeTitle}
          </Text>
        ) : null}
      </View>
      {onToggleWatch ? (
        <View className="justify-center">
          <Checkbox
            checked={watched}
            onChange={() => onToggleWatch()}
            disabled={checkboxDisabled}
            accessibilityLabel="Toggle watched"
          />
        </View>
      ) : null}
    </Pressable>
  );
}
