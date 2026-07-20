/**
 * Unit easing: `t ∈ [0, 1] → eased ∈ ℝ` (usually [0, 1]; overshoot presets may leave it).
 * CSS cubic-bezier solvers map input time through X(t) then sample Y(t).
 */

export type EasingFn = (t: number) => number;

/** CSS `cubic-bezier(x1, y1, x2, y2)` control points. */
export interface CubicBezier {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export type EasingInput = EasingName | CubicBezier | EasingFn;

/** Named presets — polynomials for speed, CSS beziers where the brand already uses them. */
export type EasingName =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInQuint"
  | "easeOutQuint"
  | "easeInOutQuint"
  | "easeOutExpo"
  | "easeOutBack"
  /** App modal enter — cubic-bezier(0.16, 1, 0.3, 1). */
  | "emphasized"
  /** App modal exit — cubic-bezier(0.7, 0, 0.84, 0). */
  | "emphasizedExit";

const POLY: Record<
  Exclude<
    EasingName,
    "ease" | "easeIn" | "easeOut" | "easeInOut" | "emphasized" | "emphasizedExit"
  >,
  EasingFn
> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) ** 2,
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  easeInQuart: (t) => t ** 4,
  easeOutQuart: (t) => 1 - (1 - t) ** 4,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  easeInQuint: (t) => t ** 5,
  easeOutQuint: (t) => 1 - (1 - t) ** 5,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

function isCubicBezier(value: EasingInput): value is CubicBezier {
  return typeof value === "object" && value !== null && "x1" in value;
}

/**
 * Build a CSS cubic-bezier easing. Solves X(t)=x with Newton–Raphson, samples Y.
 * Spec: https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }
  function sampleY(t: number): number {
    return ((ay * t + by) * t + cy) * t;
  }
  function sampleDX(t: number): number {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveT(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xEst = sampleX(t) - x;
      const d = sampleDX(t);
      if (Math.abs(xEst) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= xEst / d;
    }
    // Bisection fallback if Newton wandered off [0, 1].
    if (t < 0 || t > 1) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 20; i++) {
        const xEst = sampleX(t);
        if (Math.abs(xEst - x) < 1e-6) break;
        if (xEst < x) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return t;
  }

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  };
}

/** Resolve any easing input to a callable. */
export function resolveEasing(input: EasingInput = "easeOutCubic"): EasingFn {
  if (typeof input === "function") return input;
  if (isCubicBezier(input)) return cubicBezier(input.x1, input.y1, input.x2, input.y2);

  switch (input) {
    case "ease":
      return cubicBezier(0.25, 0.1, 0.25, 1);
    case "easeIn":
      return cubicBezier(0.42, 0, 1, 1);
    case "easeOut":
      return cubicBezier(0, 0, 0.58, 1);
    case "easeInOut":
      return cubicBezier(0.42, 0, 0.58, 1);
    case "emphasized":
      return cubicBezier(0.16, 1, 0.3, 1);
    case "emphasizedExit":
      return cubicBezier(0.7, 0, 0.84, 0);
    default:
      return POLY[input] ?? POLY.easeOutCubic;
  }
}

/**
 * Duration from travel distance and speed (px/s).
 * Optional clamps keep tiny panels from flashing and huge panels from dragging.
 */
export function durationFromSpeed(
  distancePx: number,
  speedPxPerSec: number,
  minMs = 0,
  maxMs = Number.POSITIVE_INFINITY,
): number {
  if (!(distancePx > 0) || !(speedPxPerSec > 0)) return 0;
  const ms = (distancePx / speedPxPerSec) * 1000;
  return Math.min(maxMs, Math.max(minMs, ms));
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
