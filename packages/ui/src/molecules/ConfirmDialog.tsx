/// <reference types="nativewind/types" />
import { Pressable, Text, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";
import { Modal } from "./Modal.tsx";

export type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  variant?: "danger";
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  variant,
}: ConfirmDialogProps) {
  const confirmClassName =
    variant === "danger" ? "rounded-lg bg-red-600 px-4 py-2.5" : "rounded-lg bg-yellow px-4 py-2.5";

  return (
    <Modal isOpen onClose={onClose} className="gap-3 p-4">
      <Text className="font-display text-lg italic text-snow">{title}</Text>
      <Text className="text-sm text-snow">{body}</Text>
      <View className="mt-4 flex-row justify-end gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          className="px-3 py-2.5 active:opacity-80"
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {cancelLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptic(variant === "danger" ? "error" : "medium");
            onConfirm();
            onClose();
          }}
          className={cn(confirmClassName, "active:opacity-90")}
        >
          <Text
            className={cn(
              "font-mono text-[10px] uppercase tracking-widest",
              variant === "danger" ? "text-white" : "text-void",
            )}
          >
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
