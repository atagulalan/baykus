/// <reference types="nativewind/types" />
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { Modal } from "./Modal.tsx";

export type WatchDateSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Prefill ISO timestamp (episode.lastWatchedAt). */
  initialIso?: string | null;
  title: string;
  hint: string;
  nowLabel: string;
  yesterdayLabel: string;
  saveLabel: string;
  cancelLabel: string;
  onSave: (iso: string) => void;
  busy?: boolean;
};

function toLocalInputValue(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Edit / set watch timestamp — text datetime + Now/Yesterday presets (no native picker dep). */
export function WatchDateSheet({
  isOpen,
  onClose,
  initialIso,
  title,
  hint,
  nowLabel,
  yesterdayLabel,
  saveLabel,
  cancelLabel,
  onSave,
  busy = false,
}: WatchDateSheetProps) {
  const [value, setValue] = useState(() => toLocalInputValue(initialIso));

  useEffect(() => {
    if (isOpen) setValue(toLocalInputValue(initialIso));
  }, [isOpen, initialIso]);

  function applyPreset(which: "now" | "yesterday") {
    const d = new Date();
    if (which === "yesterday") d.setDate(d.getDate() - 1);
    setValue(toLocalInputValue(d.toISOString()));
  }

  const iso = localInputToIso(value);
  const canSave = iso != null && !busy;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <View className="gap-3 p-4 pb-6">
        <Text className="font-mono text-[10px] text-muted">{hint}</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="YYYY-MM-DDTHH:mm"
          placeholderTextColor="#888888"
          className="h-11 rounded-lg border border-white/15 px-3 font-mono text-sm text-snow"
        />
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => applyPreset("now")}
            className="rounded-full border border-white/15 px-3.5 py-2 active:bg-white/5"
          >
            <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {nowLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => applyPreset("yesterday")}
            className="rounded-full border border-white/15 px-3.5 py-2 active:bg-white/5"
          >
            <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {yesterdayLabel}
            </Text>
          </Pressable>
        </View>
        <View className="mt-2 flex-row justify-end gap-2">
          <Pressable onPress={onClose} className="px-3 py-2.5">
            <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {cancelLabel}
            </Text>
          </Pressable>
          <Pressable
            disabled={!canSave}
            onPress={() => {
              if (!iso) return;
              onSave(iso);
            }}
            className={cn("rounded-full bg-yellow px-3.5 py-2.5", !canSave && "opacity-40")}
          >
            <Text className="font-mono text-[10px] uppercase tracking-widest text-void">
              {saveLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
