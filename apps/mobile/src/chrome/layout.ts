/** Viewport edge scrub heights — match web `AppEdgeBlur` (5.5rem / 6rem at rem=16). */
export const EDGE_TOP_H = 88;
export const EDGE_BOTTOM_H = 96;

/**
 * Wordmark nav row under the status bar — web mobile header `pt-6` + text-2xl + `pb-4`.
 */
export const WORDMARK_ROW_H = 56;

/** Banner/hero: scrub progress 0→1 over this scroll distance (web `BANNER_FADE_PX`). */
export const BANNER_FADE_PX = 100;

export const Z_EDGE = 35;
export const Z_CHROME = 40;

/** Routes without wordmark chrome — root AppEdgeBlur keeps the top scrub there. */
export const HIDE_WORDMARK_SEGMENTS = new Set(["login", "claim", "dev"]);

/**
 * Chrome header rail control — back, series ⋮, browse toggle, settings.
 * In-flow 44×44 hit target (web `HEADER_ACTION_CLASS`); icon size 20.
 */
export const HEADER_ACTION_CLASS =
  "z-10 h-11 w-11 items-center justify-center active:opacity-70";

/** Empty left/right rail so the absolute-centered wordmark stays put. */
export const HEADER_ACTION_SLOT_CLASS = "h-11 w-11 shrink-0 items-center justify-center";

/** Tab-screen content inset so page titles clear the fixed wordmark. */
export function tabContentTop(insetsTop: number): number {
  return insetsTop + WORDMARK_ROW_H;
}

/**
 * Extra air past the bottom scrub so the last row sits above the dock + fade.
 * Web MainShell uses 5.5rem; native needs the full 6rem blur band plus this gap.
 */
const TAB_CONTENT_BOTTOM_GAP = 24;

/**
 * Scroll/content bottom inset so the last controls clear the floating dock
 * and bottom edge blur (`EDGE_BOTTOM_H`).
 */
export function tabContentBottom(insetsBottom: number): number {
  return EDGE_BOTTOM_H + TAB_CONTENT_BOTTOM_GAP + insetsBottom;
}

/** Pin line for section pills (`StickySectionScroll.stickyOffset`) — under wordmark. */
export function stickySectionTop(insetsTop: number): number {
  return tabContentTop(insetsTop);
}
