import { Platform, type ViewStyle } from "react-native";

/**
 * Explicit stroke styles — NativeWind `border-white/10` etc. can fail to paint
 * on Pressable/View (native). On web (esp. Firefox + RN-web), `borderWidth`
 * often fails too; a 0-offset boxShadow ring is the reliable substitute.
 */
export function borderStroke(color: string, width = 1): ViewStyle {
  if (Platform.OS === "web") {
    return {
      borderWidth: 0,
      borderColor: "transparent",
      borderStyle: "solid",
      // RN-web accepts CSS boxShadow; follows border-radius like a 1px border.
      boxShadow: `0 0 0 ${width}px ${color}`,
    };
  }
  return {
    borderWidth: width,
    borderColor: color,
    borderStyle: "solid",
  };
}

export const borders = {
  /** Section pills, rating shell, next-up card — web `border-white/10`. */
  subtle: borderStroke("rgba(255, 255, 255, 0.1)"),
  /** Idle rounded checkbox — web `border-white/20`. */
  idle: borderStroke("rgba(255, 255, 255, 0.2)"),
  /** Soft yellow chips / needs-review — web `border-yellow/20`–`/25`. */
  yellowSoft: borderStroke("rgba(240, 224, 0, 0.25)"),
  none:
    Platform.OS === "web"
      ? ({ borderWidth: 0, boxShadow: "none" } satisfies ViewStyle)
      : ({ borderWidth: 0 } satisfies ViewStyle),
} as const;
