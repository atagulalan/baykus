/// <reference types="nativewind/types" />
import { Check } from "lucide-react-native";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

const DEFAULT_SIZE = 18;
const DEFAULT_STROKE = 2;
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
  /** Outer diameter in px. Default 18. */
  size?: number;
  className?: string;
};

/** Decorative SVG ring — season accordion leading glyph. */
export function CircularProgress({
  value,
  complete = false,
  caughtUp = false,
  size = DEFAULT_SIZE,
  className,
}: CircularProgressProps) {
  const stroke = Math.max(1.5, (size / DEFAULT_SIZE) * DEFAULT_STROKE);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const checkSize = Math.round(size * 0.55);

  const clamped = Math.min(100, Math.max(0, value));
  const full = complete || caughtUp;
  const display = full ? 100 : Math.min(clamped, IN_PROGRESS_CAP);
  const offset = circumference * (1 - display / 100);
  const strokeColor = complete || caughtUp ? "#22c55e" : colors.yellow;

  return (
    <View
      accessibilityElementsHidden
      className={cn("relative shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      {complete ? (
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          {/* Same green as web `text-green-500` / Tailwind green-500 */}
          <Check size={checkSize} strokeWidth={3} color="#22c55e" />
        </View>
      ) : null}
    </View>
  );
}
