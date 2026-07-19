import { Check } from "lucide-react";

const SIZE = 14;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface CircularProgressProps {
  /** 0–100 fill amount. */
  value: number;
  /** Full ring + centered check in green. */
  complete?: boolean;
  className?: string;
}

/** Compact decorative SVG ring — season accordion leading glyph. */
export function CircularProgress({
  value,
  complete = false,
  className = "",
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const offset = CIRCUMFERENCE * (1 - (complete ? 100 : clamped) / 100);
  const strokeClass = complete ? "stroke-green-500" : "stroke-yellow";

  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: SIZE, height: SIZE }}
      data-complete={complete || undefined}
      data-value={complete ? 100 : Math.round(clamped)}
    >
      {/* Decorative ring — parent is aria-hidden; count text carries the value. */}
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative progress glyph */}
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-white/10"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`${strokeClass} transition-[stroke-dashoffset] duration-300 ease-out`}
        />
      </svg>
      {complete ? <Check size={8} strokeWidth={3} className="absolute text-green-500" /> : null}
    </span>
  );
}
