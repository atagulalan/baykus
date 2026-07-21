/// <reference types="nativewind/types" />
import { ArrowDown, ArrowUp, Minus } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type RatingValue = 1 | 2 | 3;

export type RatingControlLabels = {
  group: string;
  bad: string;
  okay: string;
  good: string;
};

export type RatingControlProps = {
  value: RatingValue | null;
  onChange: (value: RatingValue | null) => void;
  labels: RatingControlLabels;
  size?: "sm" | "md";
  /** Icon-only pills — for overlays where labels are redundant. */
  iconsOnly?: boolean;
};

type Option = {
  value: RatingValue;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  key: keyof Pick<RatingControlLabels, "bad" | "okay" | "good">;
  activeBg: string;
  activeText: string;
  idleIcon: string;
};

const OPTIONS: Option[] = [
  {
    value: 1,
    Icon: ArrowDown,
    key: "bad",
    activeBg: "bg-red-500",
    activeText: "text-white",
    idleIcon: "#ef4444",
  },
  {
    value: 2,
    Icon: Minus,
    key: "okay",
    activeBg: "bg-yellow",
    activeText: "text-void",
    idleIcon: colors.yellow,
  },
  {
    value: 3,
    Icon: ArrowUp,
    key: "good",
    activeBg: "bg-green-500",
    activeText: "text-void",
    idleIcon: "#22c55e",
  },
];

/** One-tap set/clear: pressing the already-active option clears the rating. */
export function RatingControl({
  value,
  onChange,
  labels,
  size = "md",
  iconsOnly = false,
}: RatingControlProps) {
  const compact = size === "sm";
  const padding = iconsOnly
    ? compact
      ? "p-1.5"
      : "p-2"
    : compact
      ? "gap-1 px-2.5 py-1.5"
      : "gap-1.5 px-3.5 py-2";
  const labelClass = compact ? "text-[10px]" : "text-[11px]";
  const iconSize = compact ? 14 : 16;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={labels.group}
      className={cn(
        "flex-row items-center gap-0.5 rounded-full border border-white/10 bg-void/95 p-0.5",
        iconsOnly && "self-start",
      )}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={iconsOnly ? labels[opt.key] : undefined}
            onPress={() => onChange(active ? null : opt.value)}
            className={cn(
              "flex-row items-center rounded-full font-mono",
              !iconsOnly && `${labelClass} uppercase tracking-widest`,
              padding,
              active ? `${opt.activeBg} ${opt.activeText}` : "bg-transparent",
            )}
          >
            <opt.Icon
              size={iconSize}
              strokeWidth={active ? 2.5 : 2}
              color={active ? (opt.value === 1 ? "#ffffff" : colors.void) : opt.idleIcon}
            />
            {!iconsOnly ? (
              <Text className={active ? opt.activeText : "text-muted"}>{labels[opt.key]}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
