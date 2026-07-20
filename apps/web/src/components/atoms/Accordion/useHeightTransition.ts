import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import {
  durationFromSpeed,
  type EasingInput,
  prefersReducedMotion,
  resolveEasing,
} from "./easing.ts";

export type AccordionMotionState = "open" | "closed" | "opening" | "closing";

export interface HeightTransitionOptions {
  open: boolean;
  /** px/s — shared open+close unless overridden. Default 1400. */
  speed?: number;
  openSpeed?: number;
  closeSpeed?: number;
  easing?: EasingInput;
  openEasing?: EasingInput;
  closeEasing?: EasingInput;
  /** Soft floor so tiny panels still feel intentional. Default 120. */
  minDurationMs?: number;
  /** Soft ceiling so tall seasons don't drag. Default 520. */
  maxDurationMs?: number;
  /** Fade content with height (opacity 0↔1). Default true. */
  fade?: boolean;
  /** Skip enter animation when mounting already open. Default true. */
  skipEnterOnMount?: boolean;
  onOpenComplete?: () => void;
  onCloseComplete?: () => void;
}

export interface HeightTransitionResult {
  outerRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
  state: AccordionMotionState;
  /** True while children should stay in the tree. */
  present: boolean;
  style: {
    height: string;
    opacity: number;
    overflow: "hidden" | "visible";
  };
}

interface AnimRun {
  from: number;
  to: number;
  startedAt: number;
  durationMs: number;
  ease: (t: number) => number;
  opening: boolean;
}

interface TransitionConfig {
  speed: number;
  openSpeed: number | undefined;
  closeSpeed: number | undefined;
  easing: EasingInput;
  openEasing: EasingInput | undefined;
  closeEasing: EasingInput | undefined;
  minDurationMs: number;
  maxDurationMs: number;
  fade: boolean;
  skipEnterOnMount: boolean;
}

const DEFAULT_SPEED = 1400;
const DEFAULT_MIN_MS = 120;
const DEFAULT_MAX_MS = 520;

type Style = HeightTransitionResult["style"];

function measureHeight(el: HTMLElement | null): number {
  if (!el) return 0;
  return el.getBoundingClientRect().height || el.scrollHeight || 0;
}

function openStyle(): Style {
  return { height: "auto", opacity: 1, overflow: "visible" };
}

function closedStyle(fade: boolean): Style {
  return { height: "0px", opacity: fade ? 0 : 1, overflow: "hidden" };
}

function readConfig(options: HeightTransitionOptions): TransitionConfig {
  return {
    speed: options.speed ?? DEFAULT_SPEED,
    openSpeed: options.openSpeed,
    closeSpeed: options.closeSpeed,
    easing: options.easing ?? "easeInOutQuint",
    openEasing: options.openEasing,
    closeEasing: options.closeEasing,
    minDurationMs: options.minDurationMs ?? DEFAULT_MIN_MS,
    maxDurationMs: options.maxDurationMs ?? DEFAULT_MAX_MS,
    fade: options.fade ?? true,
    skipEnterOnMount: options.skipEnterOnMount ?? true,
  };
}

/**
 * Interruptible, speed-based height + opacity transition driven by rAF.
 * Duration = distance / speed (clamped). Mid-flight toggles reverse from the
 * current pixel height without jumping.
 */
export function useHeightTransition(options: HeightTransitionOptions): HeightTransitionResult {
  const configRef = useRef(readConfig(options));
  configRef.current = readConfig(options);

  const callbacksRef = useRef({
    onOpenComplete: options.onOpenComplete,
    onCloseComplete: options.onCloseComplete,
  });
  callbacksRef.current = {
    onOpenComplete: options.onOpenComplete,
    onCloseComplete: options.onCloseComplete,
  };

  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  /** Current animated height in px; `-1` means `auto` (fully open). */
  const heightRef = useRef(options.open ? -1 : 0);
  const mountedRef = useRef(false);
  const rafRef = useRef(0);
  const genRef = useRef(0);
  const runRef = useRef<AnimRun | null>(null);
  const openRef = useRef(options.open);
  openRef.current = options.open;

  const [state, setState] = useState<AccordionMotionState>(options.open ? "open" : "closed");
  const [present, setPresent] = useState(options.open);
  const [style, setStyle] = useState<Style>(() =>
    options.open ? openStyle() : closedStyle(options.fade ?? true),
  );

  useLayoutEffect(() => {
    const cfg = configRef.current;
    const reduce = prefersReducedMotion();
    const isFirst = !mountedRef.current;
    mountedRef.current = true;

    // Invalidate any in-flight rAF from a previous open/close.
    genRef.current += 1;
    const gen = genRef.current;
    cancelAnimationFrame(rafRef.current);
    runRef.current = null;

    const stillCurrent = () => gen === genRef.current;

    if (!options.open) {
      if (isFirst) {
        heightRef.current = 0;
        setState("closed");
        setPresent(false);
        setStyle(closedStyle(cfg.fade));
        return;
      }

      const from =
        heightRef.current < 0 ? measureHeight(innerRef.current) : Math.max(0, heightRef.current);

      if (reduce || from < 0.5) {
        heightRef.current = 0;
        setState("closed");
        setPresent(false);
        setStyle(closedStyle(cfg.fade));
        callbacksRef.current.onCloseComplete?.();
        return;
      }

      const durationMs = durationFromSpeed(
        from,
        cfg.closeSpeed ?? cfg.speed,
        cfg.minDurationMs,
        cfg.maxDurationMs,
      );
      const run: AnimRun = {
        from,
        to: 0,
        startedAt: performance.now(),
        durationMs,
        ease: resolveEasing(cfg.closeEasing ?? cfg.easing),
        opening: false,
      };
      runRef.current = run;
      heightRef.current = from;
      setPresent(true);
      setState("closing");
      setStyle({ height: `${from}px`, opacity: 1, overflow: "hidden" });

      const tick = (now: number) => {
        if (!stillCurrent() || !runRef.current || runRef.current.opening || openRef.current) return;
        const current = runRef.current;
        const t =
          current.durationMs <= 0 ? 1 : Math.min(1, (now - current.startedAt) / current.durationMs);
        const eased = current.ease(t);
        const h = current.from + (current.to - current.from) * eased;
        heightRef.current = h;
        setStyle({
          height: `${Math.max(0, h)}px`,
          opacity: cfg.fade ? 1 - Math.min(1, Math.max(0, eased)) : 1,
          overflow: "hidden",
        });
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        runRef.current = null;
        heightRef.current = 0;
        setState("closed");
        setPresent(false);
        setStyle(closedStyle(cfg.fade));
        callbacksRef.current.onCloseComplete?.();
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        genRef.current += 1;
        cancelAnimationFrame(rafRef.current);
      };
    }

    // —— opening ——
    setPresent(true);

    const beginOpen = () => {
      if (!stillCurrent() || !openRef.current) return;
      const cfgNow = configRef.current;
      const to = measureHeight(innerRef.current);
      const from = heightRef.current < 0 ? to : Math.max(0, heightRef.current);

      if (isFirst && cfgNow.skipEnterOnMount) {
        heightRef.current = -1;
        setState("open");
        setPresent(true);
        setStyle(openStyle());
        return;
      }

      if (reduce || Math.abs(to - from) < 0.5) {
        heightRef.current = -1;
        setState("open");
        setPresent(true);
        setStyle(openStyle());
        if (!isFirst) callbacksRef.current.onOpenComplete?.();
        return;
      }

      const durationMs = durationFromSpeed(
        Math.abs(to - from),
        cfgNow.openSpeed ?? cfgNow.speed,
        cfgNow.minDurationMs,
        cfgNow.maxDurationMs,
      );
      const run: AnimRun = {
        from,
        to,
        startedAt: performance.now(),
        durationMs,
        ease: resolveEasing(cfgNow.openEasing ?? cfgNow.easing),
        opening: true,
      };
      runRef.current = run;
      heightRef.current = from;
      setState("opening");
      setStyle({
        height: `${from}px`,
        opacity: cfgNow.fade ? 0 : 1,
        overflow: "hidden",
      });

      const tick = (now: number) => {
        if (!stillCurrent() || !runRef.current?.opening || !openRef.current) return;
        const current = runRef.current;
        const liveTo = measureHeight(innerRef.current);
        if (liveTo > 0) current.to = liveTo;

        const t =
          current.durationMs <= 0 ? 1 : Math.min(1, (now - current.startedAt) / current.durationMs);
        const eased = current.ease(t);
        const h = current.from + (current.to - current.from) * eased;
        heightRef.current = h;
        setStyle({
          height: `${Math.max(0, h)}px`,
          opacity: cfgNow.fade ? Math.min(1, Math.max(0, eased)) : 1,
          overflow: "hidden",
        });
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        runRef.current = null;
        heightRef.current = -1;
        setState("open");
        setPresent(true);
        setStyle(openStyle());
        callbacksRef.current.onOpenComplete?.();
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    // Closed → open: children appear this commit; measure after paint.
    if (heightRef.current === 0) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(beginOpen);
      });
    } else {
      beginOpen();
    }

    return () => {
      genRef.current += 1;
      cancelAnimationFrame(rafRef.current);
    };
  }, [options.open]);

  return { outerRef, innerRef, state, present, style };
}
