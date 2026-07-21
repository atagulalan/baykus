/// <reference types="nativewind/types" />
import { Text, View } from "react-native";
import { cn } from "../lib/cn.ts";

export type MiniBarsItem = {
  key: string;
  label: string;
  value: number;
  tooltip?: string;
};

export type MiniBarsProps = {
  items: MiniBarsItem[];
  /** Show every Nth label — default every label. */
  labelEvery?: number;
  className?: string;
};

/** ui.md primitive: fixed 120px vertical bars. */
export function MiniBars({ items, labelEvery = 1, className }: MiniBarsProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View className={cn("gap-2", className)}>
      <View className="h-[120px] flex-row items-end gap-1">
        {items.map((item) => (
          <View key={item.key} className="h-full min-w-0 flex-1 justify-end">
            <View
              accessibilityLabel={item.tooltip ?? `${item.label}: ${item.value}`}
              className="w-full rounded-t-sm bg-yellow"
              style={{
                height: item.value > 0 ? `${Math.max(2, (item.value / max) * 100)}%` : 0,
              }}
            />
          </View>
        ))}
      </View>
      <View className="flex-row gap-1">
        {items.map((item, i) => (
          <Text
            key={item.key}
            numberOfLines={1}
            className="min-w-0 flex-1 text-center font-mono text-[9px] uppercase tracking-widest text-muted"
          >
            {i % labelEvery === 0 ? item.label : " "}
          </Text>
        ))}
      </View>
    </View>
  );
}
