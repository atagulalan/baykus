/// <reference types="nativewind/types" />
import type { ReactNode, RefObject } from "react";
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from "react-native";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";
import { colors } from "../tokens.ts";
import { Modal, type ModalPopoverAlign } from "./Modal.tsx";

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
  /**
   * Tablet (≥640): `popover` anchors near `anchorRef` (series/season/episode menus).
   * Phone stays a bottom sheet. Confirm dialogs default to centered `modal`.
   */
  presentation?: "modal" | "popover";
  /** Trigger view for tablet popover placement. */
  anchorRef?: RefObject<View | null>;
  popoverAlign?: ModalPopoverAlign;
  /** After close animation — safe point to open a follow-up Modal (iOS). */
  onExitComplete?: () => void;
};

const TABLET_MIN_WIDTH = 640;

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
  presentation,
  anchorRef,
  popoverAlign = "end",
  onExitComplete,
}: ActionSheetProps) {
  const { width } = useWindowDimensions();
  const confirm = variant === "confirm";
  const resolvedPresentation = presentation ?? (confirm ? "modal" : "popover");
  /** Tablet anchored menu — flush list, no bottom cushion (phone sheet owns safe-area). */
  const flushPopover = !confirm && width >= TABLET_MIN_WIDTH && resolvedPresentation === "popover";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={closeLabel}
      presentation={resolvedPresentation}
      {...(anchorRef !== undefined ? { anchorRef } : {})}
      popoverAlign={popoverAlign}
      {...(onExitComplete !== undefined ? { onExitComplete } : {})}
      {...(confirm ? { className: "gap-0 p-6" } : { title, className: "p-0" })}
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
                  haptic(item.danger ? "warning" : item.primary ? "medium" : "light");
                  // Action before close — parent often clears the state that
                  // feeds `items`/`presentation`; flipping those mid-close
                  // broke Modal transform flatten (forEach of null).
                  item.onPress();
                  onClose();
                }}
                className={cn(
                  "w-full items-center rounded-lg px-4 py-2.5 disabled:opacity-40",
                  item.primary ? "bg-yellow active:opacity-90" : "active:bg-white/5",
                )}
                style={item.primary ? undefined : borders.subtle}
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
        <View>
          {description ? <Text className="px-4 pb-2 text-sm text-muted">{description}</Text> : null}
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              disabled={item.disabled}
              onPress={() => {
                if (item.disabled) return;
                haptic(item.danger ? "warning" : "light");
                item.onPress();
                onClose();
              }}
              className={cn(
                "flex-row items-center gap-2 px-4 py-3.5 active:bg-white/5 disabled:opacity-40",
                // Flush popover: no trailing hairline under the last row.
                (flushPopover ? index < items.length - 1 : true) && "border-b border-white/5",
              )}
            >
              {item.icon}
              <Text
                className={cn("font-sans text-sm", item.danger ? "text-red-400" : "text-muted")}
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
