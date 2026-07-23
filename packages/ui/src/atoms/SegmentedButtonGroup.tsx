/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type SegmentedButtonGroupProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Segmented control — calendar mode tabs idiom (E113). */
export function SegmentedButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: SegmentedButtonGroupProps<T>) {
  return (
    <View className="flex-row flex-wrap border border-white/10">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => {
              if (option.value === value || option.disabled) return;
              haptic("selection");
              onChange(option.value);
            }}
            className={cn(
              "flex-row items-center gap-1.5 px-3 py-2",
              active ? "bg-yellow" : option.disabled ? "opacity-40" : "active:bg-white/5",
            )}
          >
            {option.icon}
            <Text
              className={cn(
                "font-mono text-[10px] uppercase tracking-widest",
                active ? "text-void" : "text-muted",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
