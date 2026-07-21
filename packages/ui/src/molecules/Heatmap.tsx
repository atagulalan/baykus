/// <reference types="nativewind/types" />
import { useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";

export type HeatmapDay = { date: string; count: number };

export type HeatmapProps = {
  years: number[];
  /** Non-zero days only — client fills the year grid. */
  days: HeatmapDay[];
  ariaLabel: string;
  className?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CELL = 11;
const GAP = 3;

/** Fixed thresholds (E106): 0 / 1-2 / 3-5 / >=6. */
function intensityClass(count: number): string {
  if (count <= 0) return "bg-white/5";
  if (count <= 2) return "bg-yellow/25";
  if (count <= 5) return "bg-yellow/55";
  return "bg-yellow/90";
}

function mondayFirstWeekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/** GitHub-style day grid: week columns × 7 rows, Monday-first, horizontal scroll. */
export function Heatmap({ years, days, ariaLabel, className }: HeatmapProps) {
  const countByDate = new Map(days.map((d) => [d.date, d.count]));
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Newest years sit at the end — jump there after first layout.
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={ariaLabel}
      className={cn("pb-2", className)}
      contentContainerStyle={{ gap: 10 }}
    >
      {years.map((year) => {
        const jan1 = new Date(Date.UTC(year, 0, 1));
        const gridStart = new Date(jan1.getTime() - mondayFirstWeekday(jan1) * MS_PER_DAY);
        const dec31 = new Date(Date.UTC(year, 11, 31));
        const gridEnd = new Date(dec31.getTime() + (6 - mondayFirstWeekday(dec31)) * MS_PER_DAY);
        const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / MS_PER_DAY) + 1;
        const weekCount = Math.ceil(totalDays / 7);

        const weeks = Array.from({ length: weekCount }, (_, w) =>
          Array.from({ length: 7 }, (_, d) => {
            const date = new Date(gridStart.getTime() + (w * 7 + d) * MS_PER_DAY);
            const dateStr = date.toISOString().slice(0, 10);
            return {
              dateStr,
              inYear: date.getUTCFullYear() === year,
              count: countByDate.get(dateStr) ?? 0,
            };
          }),
        );

        return (
          <View key={year} style={{ gap: 6 }}>
            <Text className="font-mono text-[10px] tracking-widest text-muted">{year}</Text>
            <View className="flex-row" style={{ gap: GAP }}>
              {weeks.map((week) => (
                <View key={`${year}-${week[0]?.dateStr ?? "empty"}`} style={{ gap: GAP }}>
                  {week.map((cell) =>
                    cell.inYear ? (
                      <View
                        key={cell.dateStr}
                        accessibilityLabel={`${cell.dateStr}: ${cell.count}`}
                        className={cn("rounded-[1px]", intensityClass(cell.count))}
                        style={{ width: CELL, height: CELL }}
                      />
                    ) : (
                      <View key={cell.dateStr} style={{ width: CELL, height: CELL }} />
                    ),
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
