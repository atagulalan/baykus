/// <reference types="nativewind/types" />
import { Check } from "lucide-react-native";
import { Pressable } from "react-native";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

/** Shared hit box — keep every list checkbox at this size. */
export const CHECKBOX_SIZE_PX = 20;
export const CHECKBOX_ROUNDED_SIZE_PX = 36;

export const ROUNDED_CHECKBOX_SIZE_CLASS = "h-9 w-9 rounded-full";
export const ROUNDED_CHECKBOX_IDLE_CLASS = "border border-white/20 bg-transparent";

export type CheckboxVariant = "default" | "rounded";

const VARIANT = {
  default: {
    box: "h-5 w-5",
    icon: 14,
    strokeWidth: 3,
    checked: "border-yellow bg-yellow",
    unchecked: "border-white/20 bg-void",
    checkedIcon: colors.void,
    uncheckedIcon: colors.snow,
  },
  rounded: {
    box: ROUNDED_CHECKBOX_SIZE_CLASS,
    icon: 20,
    strokeWidth: 2,
    // Match web: `bg-green-500/12 text-green-500`
    checked: "border-0 bg-green-500/12",
    unchecked: ROUNDED_CHECKBOX_IDLE_CLASS,
    checkedIcon: "#22c55e",
    uncheckedIcon: colors.muted,
  },
} as const;

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  showHint?: boolean;
  variant?: CheckboxVariant;
  accessibilityLabel?: string;
  className?: string;
};

export function Checkbox({
  checked,
  onChange,
  disabled = false,
  showHint = false,
  variant = "default",
  accessibilityLabel,
  className,
}: CheckboxProps) {
  const v = VARIANT[variant];
  const iconColor = checked ? v.checkedIcon : showHint ? v.uncheckedIcon : "transparent";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className={cn(
        "relative shrink-0 items-center justify-center",
        variant === "default" && "border",
        v.box,
        checked ? v.checked : v.unchecked,
        disabled && "opacity-50",
        className,
      )}
    >
      <Check
        size={v.icon}
        strokeWidth={v.strokeWidth}
        color={iconColor}
        opacity={checked ? 1 : showHint ? 0.2 : 0}
      />
    </Pressable>
  );
}
