/// <reference types="nativewind/types" />
import { Check } from "lucide-react-native";
import type { ViewStyle } from "react-native";
import { Pressable, View } from "react-native";
import { borders } from "../lib/borders.ts";
import { cn } from "../lib/cn.ts";
import { haptic } from "../lib/haptics.ts";
import { colors } from "../tokens.ts";

/** Shared hit box — keep every list checkbox at this size (web rem=16 parity). */
export const CHECKBOX_SIZE_PX = 20;
export const CHECKBOX_ROUNDED_SIZE_PX = 36;

/** Layout class for matching ghost controls / row shells — size is fixed in style. */
export const ROUNDED_CHECKBOX_SIZE_CLASS = "h-9 w-9 rounded-full";
/** Class remnant for call sites / stories — stroke comes from `borders.idle`. */
export const ROUNDED_CHECKBOX_IDLE_CLASS = "bg-transparent";

export type CheckboxVariant = "default" | "rounded";

/** web `bg-green-500/12` */
const GREEN_SOFT = "rgba(34, 197, 94, 0.12)";
const GREEN = "#22c55e";

const VARIANT = {
  default: {
    size: CHECKBOX_SIZE_PX,
    radius: 0,
    icon: 14,
    strokeWidth: 3,
    checkedBg: colors.yellow,
    uncheckedBg: colors.void,
    checkedIcon: colors.void,
    uncheckedIcon: colors.snow,
    checkedBorder: {
      borderWidth: 1,
      borderColor: colors.yellow,
      borderStyle: "solid" as const,
    },
    uncheckedBorder: borders.idle,
  },
  rounded: {
    size: CHECKBOX_ROUNDED_SIZE_PX,
    radius: CHECKBOX_ROUNDED_SIZE_PX / 2,
    icon: 20,
    strokeWidth: 2,
    checkedBg: GREEN_SOFT,
    uncheckedBg: "transparent",
    checkedIcon: GREEN,
    uncheckedIcon: colors.muted,
    checkedBorder: borders.none,
    uncheckedBorder: borders.idle,
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
  const iconColor = checked ? v.checkedIcon : v.uncheckedIcon;
  const iconOpacity = checked ? 1 : showHint ? 0.2 : 0;
  const borderStyle = checked ? v.checkedBorder : v.uncheckedBorder;

  const boxStyle: ViewStyle = {
    width: v.size,
    height: v.size,
    borderRadius: v.radius,
    backgroundColor: checked ? v.checkedBg : v.uncheckedBg,
    ...borderStyle,
    // web default checked: `shadow-[0_0_10px_rgba(234,179,8,0.3)]`
    ...(checked && variant === "default"
      ? {
          shadowColor: "#eab308",
          shadowOpacity: 0.3,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
        }
      : {}),
  };

  return (
    <View
      className={cn(
        "relative shrink-0 items-center justify-center",
        disabled && "opacity-50",
        className,
      )}
      style={boxStyle}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={() => {
          haptic("selection");
          onChange(!checked);
        }}
        className="h-full w-full items-center justify-center active:opacity-80"
      >
        {/* Opacity on a wrapper — lucide/RN-svg `opacity` on Path can fail to paint stroke. */}
        <View style={{ opacity: iconOpacity }} pointerEvents="none">
          <Check size={v.icon} strokeWidth={v.strokeWidth} color={iconColor} />
        </View>
      </Pressable>
    </View>
  );
}
