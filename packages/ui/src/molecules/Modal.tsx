/// <reference types="nativewind/types" />
import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Modal as RNModal, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Bottom-sheet header title. */
  title?: string;
  titleAccessory?: ReactNode;
  className?: string;
  /** a11y label for the close control. */
  closeLabel?: string;
};

/**
 * Mobile-first bottom sheet overlay.
 * Web desktop modal/popover/portal behavior stays in `apps/web` until RN Web.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  titleAccessory,
  className,
  closeLabel = "Close",
}: ModalProps) {
  return (
    <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          className="absolute inset-0 bg-black/60"
          onPress={onClose}
        />
        <View
          className={cn(
            "max-h-[90%] rounded-t-2xl border border-white/10 bg-[#101010] shadow-2xl",
            className,
          )}
        >
          {title ? (
            <View className="flex-row items-center gap-2 border-b border-white/5 px-4 py-3">
              <Text className="min-w-0 flex-1 font-display text-lg italic text-snow">{title}</Text>
              {titleAccessory}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full active:bg-white/5"
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </RNModal>
  );
}
