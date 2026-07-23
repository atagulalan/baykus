/// <reference types="nativewind/types" />
import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";
import { colors } from "../tokens.ts";

export type SettingsSelectOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export type SettingsSelectProps<T extends string> = {
  value: T;
  options: SettingsSelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  hint?: string;
};

/**
 * Settings row + option sheet (RN Modal). Full Modal molecule / popover
 * desktop idiom stays web-local until molecules land.
 */
export function SettingsSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  hint,
}: SettingsSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selectedOption = options.find((o) => o.value === value);
  const sheetBottomInset = Math.round(insets.bottom) + 16;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => {
          haptic("light");
          setIsOpen((o) => !o);
        }}
        className={cn(
          "flex-row items-center justify-between rounded-xl px-3 py-3.5 active:bg-white/[0.04]",
          isOpen && "bg-white/[0.04]",
        )}
      >
        <View className="max-w-[70%]">
          <Text className="font-sans text-sm text-snow">{label}</Text>
          {hint ? <Text className="mt-0.5 font-mono text-[10px] text-muted">{hint}</Text> : null}
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="font-mono text-xs text-muted-dim">{selectedOption?.label ?? value}</Text>
          <ChevronDown size={14} color={colors.mutedDim} />
        </View>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="absolute inset-0 bg-black/60"
            onPress={() => setIsOpen(false)}
          />
          <View
            className="max-h-[70%] rounded-t-2xl border border-white/10 bg-void p-3"
            style={{ paddingBottom: sheetBottomInset }}
          >
            <Text className="mb-2 px-2 font-sans text-sm font-semibold text-snow">{label}</Text>
            <ScrollView>
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: opt.disabled }}
                    disabled={opt.disabled}
                    onPress={() => {
                      if (opt.disabled) return;
                      haptic("selection");
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "mb-0.5 flex-row items-center justify-between rounded-lg px-3 py-2.5",
                      selected ? "bg-white/5" : opt.disabled ? "opacity-30" : "active:bg-white/5",
                    )}
                  >
                    <Text
                      className={cn("font-sans text-sm", selected ? "text-yellow" : "text-snow")}
                    >
                      {opt.label}
                    </Text>
                    {selected ? <Check size={14} color={colors.yellow} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
