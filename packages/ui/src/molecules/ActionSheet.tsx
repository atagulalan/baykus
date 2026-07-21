/// <reference types="nativewind/types" />
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";
import { Modal } from "./Modal.tsx";

export type ActionSheetItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Confirm layout: yellow filled primary CTA (web up-to-here). */
  primary?: boolean;
};

export type ActionSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: ActionSheetItem[];
  busy?: boolean;
  closeLabel?: string;
  /** Body copy under the title (web mark-up-to-here desc). */
  description?: string;
  /**
   * `list` — menu rows (default).
   * `confirm` — stacked full-width CTAs; `primary` item is yellow.
   */
  variant?: "list" | "confirm";
};

/** Bottom-sheet list of actions — series / season / episode menus. */
export function ActionSheet({
  isOpen,
  onClose,
  title,
  items,
  busy = false,
  closeLabel = "Close",
  description,
  variant = "list",
}: ActionSheetProps) {
  const confirm = variant === "confirm";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={closeLabel}
      {...(confirm ? { className: "gap-0 p-6" } : { title })}
    >
      {busy ? (
        <View className="items-center py-8">
          <ActivityIndicator color={colors.yellow} />
        </View>
      ) : confirm ? (
        <View className="items-center gap-4 pb-2">
          <Text className="text-center font-display text-lg italic text-snow">{title}</Text>
          {description ? (
            <Text className="mb-2 text-center text-sm text-muted">{description}</Text>
          ) : null}
          <View className="w-full gap-2">
            {items.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                disabled={item.disabled}
                onPress={() => {
                  if (item.disabled) return;
                  onClose();
                  item.onPress();
                }}
                className={cn(
                  "w-full items-center rounded-lg px-4 py-2.5 disabled:opacity-40",
                  item.primary
                    ? "bg-yellow active:opacity-90"
                    : "border border-white/10 active:bg-white/5",
                )}
              >
                <Text
                  className={cn(
                    "font-mono text-xs uppercase tracking-widest",
                    item.primary ? "text-void" : item.danger ? "text-red-400" : "text-snow",
                  )}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View className="pb-4">
          {description ? (
            <Text className="px-4 pb-2 text-sm text-muted">{description}</Text>
          ) : null}
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              disabled={item.disabled}
              onPress={() => {
                if (item.disabled) return;
                onClose();
                item.onPress();
              }}
              className="flex-row items-center gap-2 border-b border-white/5 px-4 py-3.5 active:bg-white/5 disabled:opacity-40"
            >
              {item.icon}
              <Text
                className={cn("font-mono text-xs", item.danger ? "text-red-400" : "text-muted")}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Modal>
  );
}
