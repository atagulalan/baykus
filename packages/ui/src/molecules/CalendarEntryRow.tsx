/// <reference types="nativewind/types" />
import { Pressable, Text, View } from "react-native";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { Checkbox } from "../atoms/Checkbox.tsx";
import { cn } from "../lib/cn.ts";

export type CalendarEntryRowData = {
  episodeId: number;
  itemId: number;
  title: string;
  posterUrl: string | null;
  s: number;
  e: number;
  episodeTitle: string | null;
  networkOrProvider?: string | null;
};

export type CalendarEntryRowProps = {
  entry: CalendarEntryRowData;
  watched?: boolean;
  onPress?: () => void;
  onToggleWatched?: () => void;
  className?: string;
};

/** Timeline / month list row — series chrome + episode label. */
export function CalendarEntryRow({
  entry,
  watched = false,
  onPress,
  onToggleWatched,
  className,
}: CalendarEntryRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        "min-w-0 flex-row items-stretch gap-0 border-b border-white/5 py-2 pl-3 pr-3",
        watched && "opacity-50",
        className,
      )}
    >
      <View className="w-12 shrink-0 self-stretch overflow-hidden rounded-md bg-white/5">
        {entry.posterUrl ? (
          <MediaImage
            src={entry.posterUrl}
            accessibilityLabel={entry.title}
            wrapperClassName="h-full w-full"
            className="h-full w-full"
          />
        ) : null}
      </View>
      <View className="min-w-0 flex-1 justify-center gap-1 py-2 pl-4">
        <Text numberOfLines={1} className="font-display text-sm italic text-snow">
          {entry.title}
        </Text>
            <EpisodeLabel s={entry.s} e={entry.e} format="SxEy" className="text-muted" />
        {entry.episodeTitle ? (
          <Text numberOfLines={1} className="text-sm text-snow">
            {entry.episodeTitle}
          </Text>
        ) : null}
        {entry.networkOrProvider ? (
          <Text numberOfLines={1} className="font-mono text-[10px] text-muted">
            {entry.networkOrProvider}
          </Text>
        ) : null}
      </View>
      {onToggleWatched ? (
        <View className="justify-center">
          <Checkbox
            checked={watched}
            onChange={onToggleWatched}
            accessibilityLabel="Toggle watched"
          />
        </View>
      ) : null}
    </Pressable>
  );
}
