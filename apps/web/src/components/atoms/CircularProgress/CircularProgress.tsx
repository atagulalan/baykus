import { Check } from 'lucide-react'

const SIZE = 14
const DEFAULT_STROKE = 1.5
const RADIUS = (SIZE - DEFAULT_STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** E181: in-progress rings never close visually — keeps a readable gap at the seam. */
const IN_PROGRESS_CAP = 90

interface CircularProgressProps {
  /** 0–100 fill amount. */
  value: number
  /** Full ring + centered check in green. */
  complete?: boolean
  /**
   * Full ring in green, no check — caught up on aired episodes while announced
   * unaired episodes remain (E180). Ignored when `complete` is true.
   */
  caughtUp?: boolean
  className?: string
}

/** Compact decorative SVG ring — season accordion leading glyph. */
export function CircularProgress({
  value,
  complete = false,
  caughtUp = false,
  className = ''
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const full = complete || caughtUp
  const display = full ? 100 : Math.min(clamped, IN_PROGRESS_CAP)
  const offset = CIRCUMFERENCE * (1 - display / 100)
  // E180: caught-up shares green with complete; check mark is the only finish cue.
  const strokeClass = complete || caughtUp ? 'stroke-green-500' : 'stroke-yellow'

  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: SIZE, height: SIZE }}
      data-complete={complete || undefined}
      data-caught-up={(!complete && caughtUp) || undefined}
      data-value={Math.round(display)}
    >
      {/* Decorative ring — parent is aria-hidden; count text carries the value. */}
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative progress glyph */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={DEFAULT_STROKE}
          className="stroke-white/[0.12]"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={DEFAULT_STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`${strokeClass} transition-[stroke-dashoffset] duration-300 ease-out`}
        />
      </svg>
      {complete ? (
        <Check size={8} strokeWidth={3} className="absolute text-green-500" />
      ) : null}
    </span>
  )
}
