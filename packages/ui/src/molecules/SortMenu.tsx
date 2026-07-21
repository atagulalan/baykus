/// <reference types="nativewind/types" />
import { ArrowUpDown, Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";
import { Modal } from "./Modal.tsx";

export type LibrarySort = "title" | "added" | "rating" | "nextAir" | "lastWatched";

export type SortMenuOption = {
  value: LibrarySort;
  label: string;
};

export type SortMenuProps = {
  sort: LibrarySort;
  onChange: (sort: LibrarySort) => void;
  options: SortMenuOption[];
  title: string;
  accessibilityLabel: string;
};

/** Sort trigger + sheet of options. */
export function SortMenu({ sort, onChange, options, title, accessibilityLabel }: SortMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-white/5"
      >
        <ArrowUpDown size={16} color={colors.muted} />
      </Pressable>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={title} className="p-2">
        {options.map((opt) => {
          const selected = opt.value === sort;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "mb-0.5 flex-row items-center justify-between rounded-lg px-3 py-2.5",
                selected ? "bg-white/5" : "active:bg-white/5",
              )}
            >
              <Text className={cn("font-mono text-xs", selected ? "text-yellow" : "text-snow")}>
                {opt.label}
              </Text>
              {selected ? <Check size={14} color={colors.yellow} /> : null}
            </Pressable>
          );
        })}
      </Modal>
    </View>
  );
}
