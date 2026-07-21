/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import { cn } from "../lib/cn.ts";

export type HBarListItem = {
  key: string;
  label: string;
  value: number;
  displayValue: string;
  /** "Other" rows — muted fill instead of yellow. */
  muted?: boolean;
};

export type HBarListProps = {
  items: HBarListItem[];
  className?: string;
};

/** ui.md primitive: label / track / value, width relative to set max. */
export function HBarList({ items, className }: HBarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View className={cn("gap-2", className)}>
      {items.map((item) => {
        const width = item.value > 0 ? Math.max(2, (item.value / max) * 100) : 0;
        return (
          <View key={item.key} className="flex-row items-center gap-3">
            <Text
              numberOfLines={1}
              className="w-28 shrink-0 font-mono text-xs uppercase tracking-widest text-muted"
            >
              {item.label}
            </Text>
            <View className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5">
              <View
                className={cn("h-full rounded-full", item.muted ? "bg-white/10" : "bg-yellow")}
                style={{ width: `${width}%` }}
              />
            </View>
            <Text className="shrink-0 font-mono text-xs tabular-nums text-muted">
              {item.displayValue}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
