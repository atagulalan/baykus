/// <reference types="nativewind/types" />
import { useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { todayIso } from "../lib/airing.ts";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";

export type ScheduleStripEntry = {
  episodeId: number;
  itemId: number;
  title: string;
  posterUrl: string | null;
  s: number;
  e: number;
  episodeTitle: string | null;
  airDate: string;
  airStamp: string | null;
  isWatched: boolean;
};

export type ScheduleStripProps = {
  entries: ScheduleStripEntry[];
  onPressEntry: (entry: ScheduleStripEntry) => void;
  className?: string;
};

const COL_WIDTH = 148;

/**
 * Horizontal day-column schedule pan — mobile-friendly subset of web ScheduleGrid.
 * Groups entries by airDate, auto-scrolls toward today.
 */
export function ScheduleStrip({ entries, onPressEntry, className }: ScheduleStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const today = todayIso();

  const days = useMemo(() => {
    const map = new Map<string, ScheduleStripEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.airDate) ?? [];
      list.push(entry);
      map.set(entry.airDate, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayEntries]) => ({
        date,
        entries: dayEntries.sort((a, b) => {
          const ta = a.airStamp ?? `${a.airDate}T00:00:00Z`;
          const tb = b.airStamp ?? `${b.airDate}T00:00:00Z`;
          return ta.localeCompare(tb);
        }),
      }));
  }, [entries]);

  useEffect(() => {
    if (days.length === 0) return;
    let idx = days.findIndex((d) => d.date >= today);
    if (idx < 0) idx = days.length - 1;
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: Math.max(0, idx * COL_WIDTH - 24), animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [days, today]);

  if (days.length === 0) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={COL_WIDTH}
      className={cn(className)}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
    >
      {days.map((day) => {
        const isToday = day.date === today;
        return (
          <View
            key={day.date}
            style={{ width: COL_WIDTH }}
            className={cn(
              "rounded-xl border border-white/10 bg-white/[0.03] p-2",
              isToday && "border-yellow/40",
            )}
          >
            <Text
              className={cn(
                "mb-2 font-mono text-[10px] uppercase tracking-widest",
                isToday ? "text-yellow" : "text-muted",
              )}
            >
              {day.date.slice(5)}
              {isToday ? " · today" : ""}
            </Text>
            <View className="gap-2">
              {day.entries.map((entry) => (
                <Pressable
                  key={entry.episodeId}
                  accessibilityRole="button"
                  onPress={() => {
                    haptic("selection");
                    onPressEntry(entry);
                  }}
                  className="overflow-hidden rounded-lg border border-white/10 bg-void/80 active:bg-white/5"
                >
                  <View className="h-20 w-full overflow-hidden bg-white/5">
                    {entry.posterUrl ? (
                      <MediaImage
                        src={entry.posterUrl}
                        accessibilityLabel={entry.title}
                        wrapperClassName="h-full w-full"
                        className="h-full w-full"
                      />
                    ) : null}
                  </View>
                  <View className="gap-0.5 p-2">
                    <Text numberOfLines={1} className="font-display text-xs italic text-snow">
                      {entry.title}
                    </Text>
                    <EpisodeLabel s={entry.s} e={entry.e} format="SxEy" className="text-muted" />
                    {entry.airStamp ? (
                      <Text className="font-mono text-[9px] text-muted">
                        {entry.airStamp.slice(11, 16)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
