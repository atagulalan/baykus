/// <reference types="nativewind/types" />
import { Pressable, Text, View } from "react-native";
import { Checkbox } from "../atoms/Checkbox.tsx";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { cn } from "../lib/cn.ts";
import type { EpisodeType } from "../lib/episodeTags.ts";
import { EpisodeTags, type EpisodeTagsProps } from "./EpisodeTags.tsx";

export type CalendarEntryRowData = {
  episodeId: number;
  itemId: number;
  title: string;
  posterUrl: string | null;
  s: number;
  e: number;
  episodeTitle: string | null;
  networkOrProvider?: string | null;
  airDate?: string;
  airStamp?: string | null;
  episodeType?: EpisodeType | null;
  seasonName?: string | null;
};

export type CalendarEntryRowProps = {
  entry: CalendarEntryRowData;
  watched?: boolean;
  onPress?: () => void;
  onToggleWatched?: () => void;
  tagLabels?: EpisodeTagsProps["labels"];
  className?: string;
};

const POSTER_W = 48;
const POSTER_H = 72;

/** Timeline / month list row — series chrome + episode label. */
export function CalendarEntryRow({
  entry,
  watched = false,
  onPress,
  onToggleWatched,
  tagLabels,
  className,
}: CalendarEntryRowProps) {
  const body = (
    <>
      <View
        className="shrink-0 overflow-hidden rounded-md bg-white/5"
        style={{ width: POSTER_W, height: POSTER_H }}
      >
        {entry.posterUrl ? (
          <MediaImage
            src={entry.posterUrl}
            accessibilityLabel={entry.title}
            style={{ width: POSTER_W, height: POSTER_H }}
          />
        ) : null}
      </View>
      <View className="min-w-0 flex-1 justify-center gap-1 py-1 pl-4 pr-2">
        <Text numberOfLines={1} className="font-display text-base italic text-snow">
          {entry.title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <EpisodeLabel s={entry.s} e={entry.e} format="SxEy" className="text-muted" />
          {tagLabels && entry.airDate ? (
            <EpisodeTags
              s={entry.s}
              e={entry.e}
              airDate={entry.airDate}
              airStamp={entry.airStamp ?? null}
              episodeType={entry.episodeType ?? null}
              episodeTitle={entry.episodeTitle}
              seasonName={entry.seasonName ?? null}
              labels={tagLabels}
            />
          ) : null}
        </View>
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
    </>
  );

  return (
    <View
      className={cn(
        "min-w-0 flex-row items-center py-2 pl-3 pr-3",
        watched && "opacity-50",
        className,
      )}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          className="min-w-0 flex-1 flex-row items-center active:opacity-90"
        >
          {body}
        </Pressable>
      ) : (
        <View className="min-w-0 flex-1 flex-row items-center">{body}</View>
      )}
      {onToggleWatched ? (
        <View className="h-11 w-11 shrink-0 items-center justify-center">
          <Checkbox
            checked={watched}
            onChange={onToggleWatched}
            variant="rounded"
            accessibilityLabel="Toggle watched"
          />
        </View>
      ) : null}
    </View>
  );
}
