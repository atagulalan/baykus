import { useEffect, useRef, useState } from "react";
import {
  autoAdvanceIfSeasonJustCompleted,
  defaultExpandedSeasonNumber,
  seasonCompleteSnapshot,
} from "./seasons.ts";

type SeasonLike = {
  number: number;
  episodes: { watchCount: number; airDate: string | null; airStamp?: string | null | undefined }[];
};

/** Safety stop if open/close events never arrive (tab backgrounded, etc.). */
const PIN_MAX_MS = 1400;
/** Extra stable frames after both panels settle before releasing the pin. */
const PIN_STABLE_FRAMES = 3;
/**
 * Exp decay while accordion heights are still changing.
 * Low enough to track layout (~1 frame lag at 60fps) without floating behind.
 */
const PIN_TAU_TRACK_MS = 28;
/** Faster lock-in once open/close events have both fired. */
const PIN_TAU_SETTLE_MS = 48;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function seasonAnchorSelector(seasonNumber: number): string {
  return `[data-season-number="${seasonNumber}"]`;
}

/**
 * Ease the season root toward the sticky header by applying a fraction of the
 * layout error (`strength` ∈ (0,1]). Returns remaining px error after the step.
 *
 * When a leaving season sits *above* the target, its collapsing panel will pull
 * the target upward for free — subtract that remaining height so we never
 * scroll down just to be yanked back up (7→8 dip).
 */
export function pinSeasonHeader(
  seasonNumber: number,
  strength = 1,
  leaveSeasonNumber: number | null = null,
): number {
  const el = document.querySelector(seasonAnchorSelector(seasonNumber));
  if (!(el instanceof HTMLElement)) return 0;

  const desired = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const topBefore = el.getBoundingClientRect().top;

  let layoutCredit = 0;
  if (leaveSeasonNumber != null) {
    const leaveEl = document.querySelector(seasonAnchorSelector(leaveSeasonNumber));
    if (leaveEl instanceof HTMLElement) {
      const leaveTop = leaveEl.getBoundingClientRect().top;
      if (leaveTop < topBefore) {
        const panel = leaveEl.querySelector('[data-slot="accordion-panel"]');
        if (panel instanceof HTMLElement) {
          layoutCredit = panel.getBoundingClientRect().height;
        }
      }
    }
  }

  const rawDelta = topBefore - desired;
  const delta = rawDelta - layoutCredit;
  if (Math.abs(delta) < 0.5) {
    // Compensated error is settled; report raw viewport error (0 when already on target).
    return Math.abs(rawDelta) < 0.5 ? 0 : rawDelta;
  }

  const clamped = Math.min(1, Math.max(0, strength));
  const step = delta * clamped;
  if (Math.abs(step) >= 0.05) {
    window.scrollBy({ top: step, left: 0, behavior: "instant" });
  }
  return el.getBoundingClientRect().top - desired;
}

/** User scroll intents — pin must yield immediately (never trap the scrollbar). */
const USER_SCROLL_EVENTS = ["wheel", "touchmove", "keydown", "pointerdown"] as const;

function isScrollKey(event: Event): boolean {
  if (!(event instanceof KeyboardEvent)) return true;
  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown":
    case "PageUp":
    case "PageDown":
    case "Home":
    case "End":
    case " ":
      return true;
    default:
      return false;
  }
}

/**
 * One pin session: keep `target` glued under the sticky chrome while the
 * leaving panel closes and the target opens. Ends when both completion
 * events fire (plus a couple of stable frames), on timeout, or the moment
 * the user scrolls / touches the page.
 */
class SeasonPinSession {
  target: number | null = null;
  leave: number | null = null;
  closeDone = true;
  openDone = true;

  private raf = 0;
  private gen = 0;
  private startedAt = 0;
  private lastAt = 0;
  private stableFrames = 0;
  private unbindUserAbort: (() => void) | null = null;

  get active(): boolean {
    return this.target != null;
  }

  stop(): void {
    this.gen += 1;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbindUserAbort?.();
    this.unbindUserAbort = null;
    this.target = null;
    this.leave = null;
    this.closeDone = true;
    this.openDone = true;
    this.stableFrames = 0;
    this.lastAt = 0;
  }

  /** Begin simultaneous close + open + scroll for `target` (leaving may be null). */
  start(target: number, leaving: number | null): void {
    this.stop();

    const gen = this.gen;
    this.target = target;
    this.leave = leaving;
    this.closeDone = leaving == null;
    this.openDone = false;
    this.stableFrames = 0;
    this.startedAt = performance.now();
    this.lastAt = this.startedAt;

    // Yield to the user the instant they take the scroll — pin is assistive, not a lock.
    const onUserScroll = (event: Event) => {
      if (gen !== this.gen) return;
      if (event.type === "keydown" && !isScrollKey(event)) return;
      // Ignore pointerdowns on interactive controls (season toggle, episode check…).
      if (event.type === "pointerdown") {
        const t = event.target;
        if (
          t instanceof Element &&
          t.closest("button, a, input, textarea, select, [role='button'], [role='checkbox']")
        ) {
          return;
        }
      }
      this.stop();
    };

    for (const type of USER_SCROLL_EVENTS) {
      window.addEventListener(type, onUserScroll, { passive: true, capture: true });
    }
    this.unbindUserAbort = () => {
      for (const type of USER_SCROLL_EVENTS) {
        window.removeEventListener(type, onUserScroll, { capture: true });
      }
    };

    const tick = (now: number) => {
      if (gen !== this.gen || this.target == null) return;

      const dt = Math.min(48, Math.max(0, now - this.lastAt));
      this.lastAt = now;

      const settled = this.closeDone && this.openDone;
      const reduce = prefersReducedMotion();
      const tau = settled ? PIN_TAU_SETTLE_MS : PIN_TAU_TRACK_MS;
      const strength = reduce ? 1 : 1 - Math.exp(-dt / tau);
      const error = pinSeasonHeader(this.target, strength, this.leave);

      if (settled && Math.abs(error) < 0.75) this.stableFrames += 1;
      else this.stableFrames = 0;

      const timedOut = now - this.startedAt > PIN_MAX_MS;
      if ((settled && this.stableFrames >= PIN_STABLE_FRAMES) || timedOut) {
        pinSeasonHeader(this.target, 1, this.leave);
        this.stop();
        return;
      }

      this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
  }

  markCloseComplete(seasonNumber: number): void {
    if (this.leave === seasonNumber) this.closeDone = true;
  }

  markOpenComplete(seasonNumber: number): void {
    if (this.target === seasonNumber) this.openDone = true;
  }
}

/**
 * E176: close previous + open next + scroll run together.
 * A rAF pin loop keeps the target header fixed while heights change;
 * the loop stops when the leaving panel’s close-complete and the target’s
 * open-complete have both fired (event-driven, not timed).
 */
export function useSeasonAccordionAdvance(options: {
  seasons: SeasonLike[] | undefined;
  /** Stable id for the series/preview — reset expand state when it changes. */
  identity: string | number | null | undefined;
  nextUnwatched: { s: number; e: number } | null;
  /** When false, skip init + advance (e.g. preview already in library). */
  enabled?: boolean;
}): {
  expandedSeasonNumber: number | null;
  onToggleExpanded: (seasonNumber: number) => void;
  onSeasonCloseComplete: (seasonNumber: number) => void;
  onSeasonOpenComplete: (seasonNumber: number) => void;
} {
  const { seasons, identity, nextUnwatched, enabled = true } = options;
  const [expandedSeasonNumber, setExpandedSeasonNumber] = useState<number | null>(null);

  const completeRef = useRef<Map<number, boolean>>(new Map());
  const initIdentityRef = useRef<string | number | null>(null);
  const expandedRef = useRef(expandedSeasonNumber);
  expandedRef.current = expandedSeasonNumber;
  const pinRef = useRef<SeasonPinSession>(new SeasonPinSession());

  // Default open season when the series identity first resolves.
  useEffect(() => {
    if (!enabled || seasons == null || identity == null) return;
    if (initIdentityRef.current === identity) return;
    initIdentityRef.current = identity;
    pinRef.current.stop();
    completeRef.current = seasonCompleteSnapshot(seasons);
    setExpandedSeasonNumber(defaultExpandedSeasonNumber(nextUnwatched));
  }, [enabled, seasons, identity, nextUnwatched]);

  // Auto-advance only when seasons data changes (watch flip), not when expand
  // state changes — avoids re-entering and racing an in-flight pin session.
  useEffect(() => {
    if (!enabled || seasons == null) return;

    const current = expandedRef.current;
    const next = autoAdvanceIfSeasonJustCompleted(seasons, current, completeRef.current);
    completeRef.current = seasonCompleteSnapshot(seasons);
    if (next === undefined) return;

    if (next == null) {
      pinRef.current.stop();
      setExpandedSeasonNumber(null);
      return;
    }

    pinRef.current.start(next, current);
    setExpandedSeasonNumber(next);
  }, [enabled, seasons]);

  useEffect(
    () => () => {
      pinRef.current.stop();
    },
    [],
  );

  function onToggleExpanded(seasonNumber: number) {
    const current = expandedRef.current;

    if (current === seasonNumber) {
      // Collapse only — no pin/scroll (E176).
      pinRef.current.stop();
      setExpandedSeasonNumber(null);
      return;
    }

    pinRef.current.start(seasonNumber, current);
    setExpandedSeasonNumber(seasonNumber);
  }

  function onSeasonCloseComplete(seasonNumber: number) {
    pinRef.current.markCloseComplete(seasonNumber);
  }

  function onSeasonOpenComplete(seasonNumber: number) {
    pinRef.current.markOpenComplete(seasonNumber);
  }

  return {
    expandedSeasonNumber,
    onToggleExpanded,
    onSeasonCloseComplete,
    onSeasonOpenComplete,
  };
}
