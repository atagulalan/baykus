import { useQuery } from "@tanstack/react-query";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getSettings } from "../../../api/client.ts";
import { Z } from "../../../lib/zIndex.ts";
import { APP_HEADER_HOOK, isBannerChromePage, useCommittedPathname } from "./layoutShared.ts";

/** Banner/hero: scrub progress 0→1 over this scroll distance (linear). */
const BANNER_FADE_PX = 100;
const BLUR_MIN_PX = 1;
const BLUR_MAX_PX = 8;
/** Match dock-hide nav reveal (`duration-300` + cubic-bezier(0.32, 0.72, 0, 1)). */
const HOVER_SCRUB_MS = 300;

type Edge = "top" | "bottom";

/** Progressive blur mask — opaque at the screen edge, clear toward content. */
function blurMask(edge: Edge): string {
  return edge === "top"
    ? "linear-gradient(to bottom, black, black, transparent)"
    : "linear-gradient(to top, black, black, transparent)";
}

/**
 * Black fade with alphas scaled by progress.
 * Never uses the CSS `opacity` property — that kills backdrop-filter.
 */
function blackGradient(edge: Edge, progress: number): string {
  const a = (peak: number) => Math.min(Math.max(peak * progress, 0), 1);
  const stops = `rgb(0 0 0 / ${a(1)}) 0%, rgb(0 0 0 / ${a(0.72)}) 28%, rgb(0 0 0 / ${a(0.35)}) 55%, rgb(0 0 0 / ${a(0.1)}) 78%, transparent 100%`;
  return edge === "top"
    ? `linear-gradient(to bottom, ${stops})`
    : `linear-gradient(to top, ${stops})`;
}

/** Linear blur px for progress t∈[0,1]: 0 at rest, then 1→8. */
function blurPxForProgress(t: number): number {
  if (t <= 0) return 0;
  return BLUR_MIN_PX + t * (BLUR_MAX_PX - BLUR_MIN_PX);
}

/** Approx. cubic-bezier(0.32, 0.72, 0, 1) — same feel as dock-hide translate. */
function dockEase(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  // 1 - (1-t)^3 is close enough for the out-heavy bezier without solving cubics.
  return 1 - (1 - clamped) ** 3;
}

/**
 * Animate a 0↔1 hover contribution so edge scrub feels like scrolling 0→100px,
 * timed with the nav slide-in.
 */
function useHoverScrub(hovering: boolean): number {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = progressRef.current;
    const to = hovering ? 1 : 0;
    if (from === to) return;

    const started = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min((now - started) / HOVER_SCRUB_MS, 1);
      const next = from + (to - from) * dockEase(t);
      progressRef.current = next;
      setProgress(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hovering]);

  return progress;
}

/** Track pointer hover on the app header (dock-hide reveal zone).
 *  Fine-pointer + hover only — touch taps sticky-hover and look wrong. */
function useBannerHeaderHover(enabled: boolean): boolean {
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHovering(false);
      return;
    }

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    let header: Element | null = null;

    const onEnter = () => setHovering(true);
    const onLeave = () => setHovering(false);

    function unbind() {
      header?.removeEventListener("mouseenter", onEnter);
      header?.removeEventListener("mouseleave", onLeave);
      header = null;
      setHovering(false);
    }

    function bind() {
      unbind();
      if (!canHover.matches) return;
      header = document.querySelector(`[${APP_HEADER_HOOK}]`);
      if (!header) return;
      header.addEventListener("mouseenter", onEnter);
      header.addEventListener("mouseleave", onLeave);
    }

    bind();
    canHover.addEventListener("change", bind);
    return () => {
      canHover.removeEventListener("change", bind);
      unbind();
    };
  }, [enabled]);

  return hovering;
}

/**
 * Two Layout chrome layers (each with its own view-transition-name):
 *   1) black gradient tint
 *   2) masked blur — backdrop-filter lives on the *named* node so the UA copies
 *      it onto ::view-transition-group during route fades (CSS VT Level 1).
 *      A child filter is dropped on the floor and is what caused the blink.
 */
const EdgeScrub = memo(function EdgeScrub({
  edge,
  height,
  vtName,
  progress,
  className = "",
}: {
  edge: Edge;
  height: string;
  vtName: string;
  /** 0–1 scrub strength. */
  progress: number;
  className?: string;
}) {
  const mask = blurMask(edge);
  const blurPx = blurPxForProgress(progress);
  const blurValue = blurPx > 0 ? `blur(${blurPx}px)` : "none";
  const edgeStyle = {
    [edge]: 0,
    height,
    zIndex: Z.edgeBlur,
  } as const;

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 ${className}`}
        style={{
          ...edgeStyle,
          viewTransitionName: `${vtName}-tint`,
          backgroundImage: blackGradient(edge, progress),
        }}
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed inset-x-0 ${className}`}
        style={{
          ...edgeStyle,
          // backdrop-filter MUST be on this named element (not a child).
          viewTransitionName: `${vtName}-blur`,
          backdropFilter: blurValue,
          WebkitBackdropFilter: blurValue,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
        aria-hidden
      />
    </>
  );
});

function isActiveViewTransition(): boolean {
  try {
    return document.documentElement.matches(":active-view-transition");
  } catch {
    return false;
  }
}

/**
 * During a view transition: use the destination `want` for the NEW plate on
 * first paint, then freeze against further scrub changes until the transition
 * ends (scroll restoration / hover must not mutate backdrop-filter on the live
 * named node mid-VT).
 *
 * Do NOT hold the *previous* page's progress — that left browse→hero with a
 * full 5.5rem frost band over the banner until the cross-fade finished.
 */
function useSettledProgress(want: number): number {
  const frozenRef = useRef<number | null>(null);
  const [, setEpoch] = useState(0);

  useLayoutEffect(() => {
    let cancelled = false;

    if (!isActiveViewTransition()) {
      frozenRef.current = null;
      return;
    }

    if (frozenRef.current === null) {
      frozenRef.current = want;
    }

    let raf = 0;
    const poll = () => {
      if (cancelled) return;
      if (isActiveViewTransition()) {
        raf = requestAnimationFrame(poll);
        return;
      }
      frozenRef.current = null;
      setEpoch((n) => n + 1);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [want]);

  return frozenRef.current ?? want;
}

/**
 * Edge scrubs under chrome, above page. Bottom is mobile-only.
 * Banner/hero: over the first 100px of scroll — or a matching hover scrub when
 * dock-hide nav reveals — gradient alphas and blur radius (1→8px) ramp linearly.
 * No CSS opacity on either layer.
 */
export const AppEdgeBlur = memo(function AppEdgeBlur() {
  const pathname = useCommittedPathname();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const isBannerPage = isBannerChromePage(pathname, settingsQuery.data?.bannerRef);
  const [scrollY, setScrollY] = useState(0);
  const bannerHover = useBannerHeaderHover(isBannerPage);
  const hoverProgress = useHoverScrub(bannerHover);

  useLayoutEffect(() => {
    if (!isBannerPage) {
      setScrollY(0);
      return;
    }
    // pathname in deps: re-sample scrollY on banner→banner navigations
    // (scroll events may not fire when ScrollRestoration jumps).
    void pathname;
    function update() {
      setScrollY(window.scrollY);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname, isBannerPage]);

  const scrollProgress = isBannerPage ? Math.min(Math.max(scrollY / BANNER_FADE_PX, 0), 1) : 1;
  const wantTop = isBannerPage ? Math.max(scrollProgress, hoverProgress) : 1;
  const topProgress = useSettledProgress(wantTop);

  return (
    <>
      <EdgeScrub edge="top" height="5.5rem" vtName="app-edge-top" progress={topProgress} />
      <EdgeScrub
        edge="bottom"
        height="6rem"
        vtName="app-edge-bottom"
        progress={1}
        className="sm:hidden"
      />
    </>
  );
});
