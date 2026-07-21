/// <reference types="nativewind/types" />
import { Minus, Plus } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type StepperInputLabels = {
  decrease: string;
  increase: string;
  value: string;
};

export type StepperInputProps = {
  value: number;
  onChange: (value: number) => void;
  labels: StepperInputLabels;
  min?: number;
  max?: number;
  step?: number;
};

/**
 * Stepper with −/+ and a numeric field (E118).
 * Long-press accelerates: hold 200ms → repeat every 100ms.
 */
export function StepperInput({
  value,
  onChange,
  labels,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
}: StepperInputProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  function handleInputBlur() {
    const parsed = Number(inputValue);
    if (Number.isFinite(parsed) && Number.isInteger(parsed)) {
      const clamped = clamp(parsed);
      if (clamped !== value) onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  }

  const stopRepeat = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  function startRepeat(delta: number) {
    stopRepeat();
    const doStep = () => {
      onChange(clamp(valueRef.current + delta));
    };
    doStep();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(doStep, 100);
    }, 200);
  }

  useEffect(() => stopRepeat, [stopRepeat]);

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View className="flex-row items-center border border-white/10">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.decrease}
        disabled={atMin}
        onPressIn={() => {
          if (!atMin) startRepeat(-step);
        }}
        onPressOut={stopRepeat}
        className={cn(
          "h-9 w-9 items-center justify-center",
          atMin ? "opacity-30" : "active:bg-white/5",
        )}
      >
        <Minus size={14} color={atMin ? colors.muted : colors.muted} />
      </Pressable>
      <TextInput
        accessibilityLabel={labels.value}
        keyboardType="number-pad"
        value={inputValue}
        onChangeText={setInputValue}
        onBlur={handleInputBlur}
        onSubmitEditing={handleInputBlur}
        className="h-9 w-12 bg-transparent text-center font-mono text-sm tabular-nums text-snow"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.increase}
        disabled={atMax}
        onPressIn={() => {
          if (!atMax) startRepeat(step);
        }}
        onPressOut={stopRepeat}
        className={cn(
          "h-9 w-9 items-center justify-center",
          atMax ? "opacity-30" : "active:bg-white/5",
        )}
      >
        <Plus size={14} color={colors.muted} />
      </Pressable>
    </View>
  );
}
