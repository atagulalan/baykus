/// <reference types="nativewind/types" />
import { useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EpisodeLabel } from "../atoms/EpisodeLabel.tsx";
import {
  buildScheduleGridModel,
  type ScheduleGridDayInput,
  type ScheduleGridEpisode,
} from "../lib/buildScheduleModel.ts";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";

export type ScheduleGridProps = {
  days: ScheduleGridDayInput[];
  locale?: string;
  onPressEpisode: (episode: ScheduleGridEpisode) => void;
  /** Fired when horizontal scroll nears the leading edge (load past). */
  onNearStart?: () => void;
  /** Fired when horizontal scroll nears the trailing edge (load future). */
  onNearEnd?: () => void;
  className?: string;
};

const COL_W = 76;
const EDGE_PX = 96;

/** Week×weekday schedule matrix — native port of web ScheduleGrid (finite window). */
export function ScheduleGrid({
  days,
  locale = "tr-TR",
  onPressEpisode,
  onNearStart,
  onNearEnd,
  className,
}: ScheduleGridProps) {
  const scrollRef = useRef<ScrollView>(null);
  const edgeLock = useRef<"start" | "end" | null>(null);
  const model = useMemo(() => buildScheduleGridModel(days, { locale }), [days, locale]);

  useEffect(() => {
    const idx = model.columns.findIndex(
      (c) => c.type === "week" && c.absWeek === model.currentAbsWeek,
    );
    if (idx < 0) return;
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, idx * COL_W - 40),
        animated: false,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [model.columns, model.currentAbsWeek]);

  if (model.columns.length === 0) return null;

  return (
    <View className={cn("gap-2", className)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 8 }}
        scrollEventThrottle={64}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const x = contentOffset.x;
          const max = Math.max(0, contentSize.width - layoutMeasurement.width);
          if (x <= EDGE_PX) {
            if (edgeLock.current !== "start") {
              edgeLock.current = "start";
              onNearStart?.();
            }
          } else if (x >= max - EDGE_PX) {
            if (edgeLock.current !== "end") {
              edgeLock.current = "end";
              onNearEnd?.();
            }
          } else {
            edgeLock.current = null;
          }
        }}
      >
        <View>
          {/* Week headers */}
          <View className="mb-1 flex-row border-b border-white/10">
            <View style={{ width: 56 }} className="justify-end pb-2 pr-1">
              <Text className="font-mono text-[9px] uppercase tracking-widest text-muted"> </Text>
            </View>
            {model.columns.map((col) =>
              col.type === "gap" ? (
                <View
                  key={`gap-${col.startAbsWeek}`}
                  style={{ width: COL_W }}
                  className="items-center justify-center border-l border-white/5 py-2"
                >
                  <Text className="font-mono text-[10px] text-muted">···</Text>
                </View>
              ) : (
                <View
                  key={`h-${col.absWeek}`}
                  style={{ width: COL_W }}
                  className={cn(
                    "items-center border-l border-white/5 px-1 py-2",
                    col.isCurrent && "border-t-2 border-t-yellow",
                  )}
                >
                  <Text
                    numberOfLines={2}
                    className={cn(
                      "text-center font-mono text-[9px] uppercase tracking-widest",
                      col.isCurrent ? "text-yellow" : "text-muted",
                    )}
                  >
                    {col.label}
                  </Text>
                </View>
              ),
            )}
          </View>

          {/* Weekday rows */}
          {model.weekdayLabels.map((label, dow) => (
            <View
              key={label}
              className="flex-row border-t border-white/5"
              style={{ minHeight: 52 }}
            >
              <View style={{ width: 56 }} className="justify-start pt-1.5 pr-1">
                <Text className="font-display text-sm italic text-snow">{label}</Text>
              </View>
              {model.columns.map((col) => {
                if (col.type === "gap") {
                  return (
                    <View
                      key={`g-${col.startAbsWeek}-${label}`}
                      style={{ width: COL_W }}
                      className="border-l border-white/5 bg-white/[0.02]"
                    />
                  );
                }
                const eps = col.byDow[dow] ?? [];
                return (
                  <View
                    key={`c-${col.absWeek}-${label}`}
                    style={{ width: COL_W }}
                    className={cn(
                      "gap-1 border-l border-white/5 p-1",
                      col.isCurrent && "bg-yellow/5",
                    )}
                  >
                    {eps.map((ep) => (
                      <Pressable
                        key={ep.episodeId}
                        accessibilityRole="button"
                        onPress={() => {
                          haptic("selection");
                          onPressEpisode(ep);
                        }}
                        className={cn(
                          "rounded border border-white/10 bg-void/90 px-1 py-1 active:bg-white/10",
                          ep.isWatched && "opacity-40",
                        )}
                      >
                        <Text
                          numberOfLines={1}
                          className="font-display text-[10px] italic text-snow"
                        >
                          {ep.title}
                        </Text>
                        <EpisodeLabel
                          s={ep.s}
                          e={ep.e}
                          format="SxEy"
                          className="text-[9px] text-muted"
                        />
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
