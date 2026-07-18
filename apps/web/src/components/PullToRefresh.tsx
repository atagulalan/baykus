import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { History, RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  startManualSweep,
  useManualRefreshProgress,
  useManualRefreshRunning,
} from "../lib/staleSweep.ts";
import { useToast } from "../lib/toast.tsx";

/** E132 gesture tuning: dampening divisor, trigger threshold, travel cap (px). */
const PULL_RESISTANCE = 2.5;
const PULL_THRESHOLD_PX = 60;
const PULL_MAX_PX = 96;
/** Indicator hold offset while the refresh promise is in flight. */
const REFRESHING_HOLD_PX = 48;
/** Vertical travel before the gesture directional-locks into a pull. */
const LOCK_SLOP_PX = 10;

/**
 * E132: the pull gesture triggers the same action as Settings → Data
 * "Refresh all", then refetches the calling page — `["library"]` plus the
 * extra keys the page's non-library queries live under. The invalidation is
 * unconditional because the sweep may have been guard-skipped (quiet sweep or
 * manual refresh already in flight) and a pull must always refetch the page.
 */
export function useLibrarySweepRefresh(...extraKeys: QueryKey[]): () => Promise<void> {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return async () => {
    await startManualSweep(queryClient, toast, {
      done: (newEpisodes) => t("library.refreshAllDone", { newEpisodes }),
      error: t("errors.generic"),
    });
    await Promise.all(
      [["library"] as QueryKey, ...extraKeys].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  };
}

type PullToRefreshProps =
  | {
      /** Default: library sweep + page invalidate (E132). */
      variant?: "refresh";
      onRefresh: () => Promise<void>;
      children: ReactNode;
    }
  | {
      /** E160: `/` and `/watch` open watch history instead of refreshing. */
      variant: "history";
      onOpen: () => void;
      children: ReactNode;
    };

/**
 * Touch-only overscroll pull. `variant="refresh"` (default) is E132
 * pull-to-refresh on calendar / all-series / favorites / watch-history.
 * `variant="history"` is E160 pull-to-view-history on library + watch —
 * same gesture mechanics, History icon, navigates on release past threshold.
 *
 * Arms only when the touch starts at document top, directional-locks so
 * horizontal pans stay untouched, and preventDefaults the pull so the
 * browser's native pull-to-reload never races it. No mouse variant —
 * Refresh all (Settings → Data) remains the pointer refresh path; history
 * stays reachable at `/watch/history` (and via this gesture on touch).
 */
export function PullToRefresh(props: PullToRefreshProps) {
  const isHistory = props.variant === "history";
  const onRefresh = !isHistory ? props.onRefresh : undefined;
  const onOpen = isHistory ? props.onOpen : undefined;
  const children = props.children;

  const rootRef = useRef<HTMLDivElement | null>(null);
  /** Local hold covering post-sweep page invalidation after *this* pull. */
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const manualRunning = useManualRefreshRunning();
  const sweepProgress = useManualRefreshProgress();
  // History variant never holds for a sweep — release navigates immediately.
  const busy = isHistory ? false : localRefreshing || manualRunning;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const [pullPx, setPullPx] = useState(busy ? REFRESHING_HOLD_PX : 0);
  const [tracking, setTracking] = useState(false);
  const pullPxRef = useRef(busy ? REFRESHING_HOLD_PX : 0);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // Mirror a sweep that started elsewhere (Settings / other PTR page)
  // into the hold offset; collapse only when both local and global are idle.
  useEffect(() => {
    if (busy) {
      pullPxRef.current = REFRESHING_HOLD_PX;
      setPullPx(REFRESHING_HOLD_PX);
      return;
    }
    pullPxRef.current = 0;
    setPullPx(0);
  }, [busy]);

  useEffect(() => {
    const html = document.documentElement.style;
    const body = document.body.style;
    const prev = [html.overscrollBehaviorY, body.overscrollBehaviorY] as const;
    html.overscrollBehaviorY = "contain";
    body.overscrollBehaviorY = "contain";
    return () => {
      html.overscrollBehaviorY = prev[0];
      body.overscrollBehaviorY = prev[1];
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let armed = false;
    let startX = 0;
    let startY = 0;
    // null = undecided, true = we own the gesture, false = bailed (horizontal).
    let locked: boolean | null = null;
    let scrollLockPrev: string | null = null;

    function setPull(px: number) {
      pullPxRef.current = px;
      setPullPx(px);
    }

    // Real devices commit the gesture to scrolling before the directional
    // lock fires (the un-prevented slop moves), after which preventDefault is
    // ignored (cancelable=false) — dragging back up would scroll the body
    // while the indicator collapses. So once the pull owns the gesture the
    // document scroll is frozen outright (Modal's body scroll-lock idiom;
    // safe: we only lock at scrollY === 0) until the finger lifts.
    function lockBodyScroll() {
      if (scrollLockPrev !== null) return;
      scrollLockPrev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    function unlockBodyScroll() {
      if (scrollLockPrev === null) return;
      document.body.style.overflow = scrollLockPrev;
      scrollLockPrev = null;
    }

    function onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch || busyRef.current || window.scrollY > 0) {
        armed = false;
        return;
      }
      armed = true;
      locked = null;
      startX = touch.clientX;
      startY = touch.clientY;
      setTracking(true);
    }

    function onTouchMove(event: TouchEvent) {
      if (!armed || busyRef.current || locked === false) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (locked === null) {
        if (Math.abs(dx) > Math.abs(dy)) {
          locked = false;
          return;
        }
        if (dy < LOCK_SLOP_PX) return;
        if (window.scrollY > 0) {
          // The un-prevented pre-lock moves already started a real scroll —
          // leave the gesture to the browser.
          locked = false;
          return;
        }
        locked = true;
        lockBodyScroll();
      }

      // Own the whole gesture from here: consume every move, upward ones
      // included. Letting even one through hands the rest of the gesture to
      // body scroll, which yanks the page the moment the finger drifts up —
      // instead the pull clamps to 0 and re-grows if the finger comes back
      // down (xava's device finding).
      event.preventDefault();
      setPull(Math.max(0, Math.min(dy / PULL_RESISTANCE, PULL_MAX_PX)));
    }

    function onTouchEnd() {
      unlockBodyScroll();
      if (!armed) return;
      armed = false;
      const shouldTrigger = locked === true && pullPxRef.current >= PULL_THRESHOLD_PX;
      locked = null;
      setTracking(false);
      if (!shouldTrigger || busyRef.current) {
        // Busy: keep the hold offset from the busy-sync effect; otherwise collapse.
        if (!busyRef.current) setPull(0);
        return;
      }
      if (onOpenRef.current) {
        setPull(0);
        onOpenRef.current();
        return;
      }
      setLocalRefreshing(true);
      setPull(REFRESHING_HOLD_PX);
      const refresh = onRefreshRef.current;
      if (!refresh) {
        setLocalRefreshing(false);
        return;
      }
      refresh().finally(() => {
        setLocalRefreshing(false);
      });
    }

    function onTouchCancel() {
      unlockBodyScroll();
      armed = false;
      locked = null;
      setTracking(false);
      if (!busyRef.current) setPull(0);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchCancel);
    return () => {
      unlockBodyScroll();
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  // Padding (not transform) on the content: a transform ancestor becomes the
  // sticky containing block, so category/watch headers stop pinning under the
  // app header for the whole pull + refreshing-hold. Prefer padding over
  // margin — margin-top collapses through this relative root and the spinner
  // (absolute + translateY) would ride that collapse *plus* its own transform.
  const settleClass = tracking ? "" : "transition-[padding] duration-200";
  const indicatorSettleClass = tracking ? "" : "transition-[height] duration-200";
  const past = pullPx >= PULL_THRESHOLD_PX;
  const iconClass = busy ? "animate-spin text-yellow" : past ? "text-yellow" : "text-muted";

  return (
    <div ref={rootRef} className="relative">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center ${indicatorSettleClass}`}
        style={{
          height: pullPx,
          opacity: busy ? 1 : Math.min(pullPx / PULL_THRESHOLD_PX, 1),
        }}
      >
        <div className="flex items-center justify-center gap-2">
          {isHistory ? (
            <History size={18} strokeWidth={1.75} className={past ? "text-yellow" : "text-muted"} />
          ) : (
            <RefreshCw
              size={18}
              strokeWidth={1.5}
              className={iconClass}
              style={busy ? undefined : { transform: `rotate(${pullPx * 3}deg)` }}
            />
          )}
          {!isHistory && busy && sweepProgress && (
            <span className="font-mono text-[10px] tracking-widest text-muted">
              {sweepProgress.done}/{sweepProgress.total}
            </span>
          )}
        </div>
      </div>
      <div className={settleClass} style={pullPx > 0 ? { paddingTop: `${pullPx}px` } : undefined}>
        {children}
      </div>
    </div>
  );
}
