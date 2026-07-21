/// <reference types="nativewind/types" />
import { Check } from "lucide-react-native";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

const SIZE = 14;
const DEFAULT_STROKE = 1.5;
const RADIUS = (SIZE - DEFAULT_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** E181: in-progress rings never close visually. */
const IN_PROGRESS_CAP = 90;

export type CircularProgressProps = {
  /** 0–100 fill amount. */
  value: number;
  /** Full ring + centered check in green. */
  complete?: boolean;
  /**
   * Full ring in green, no check — caught up on aired while unaired remain (E180).
   */
  caughtUp?: boolean;
  className?: string;
};

/** Compact decorative SVG ring — season accordion leading glyph. */
export function CircularProgress({
  value,
  complete = false,
  caughtUp = false,
  className,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const full = complete || caughtUp;
  const display = full ? 100 : Math.min(clamped, IN_PROGRESS_CAP);
  const offset = CIRCUMFERENCE * (1 - display / 100);
  const stroke = complete || caughtUp ? "#22c55e" : colors.yellow;

  return (
    <View
      accessibilityElementsHidden
      className={cn("relative shrink-0 items-center justify-center", className)}
      style={{ width: SIZE, height: SIZE }}
    >
      <Svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={DEFAULT_STROKE}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={DEFAULT_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
        />
      </Svg>
      {complete ? (
        <View className="absolute items-center justify-center">
          <Check size={8} strokeWidth={3} color="#22c55e" />
        </View>
      ) : null}
    </View>
  );
}
