import { useRouterState } from "@tanstack/react-router";
import { CalendarDays, GanttChart, LayoutGrid, List, Play, Search } from "lucide-react";
import { readBrowsePath } from "../../../lib/uiPrefs.ts";
import {
  ROUNDED_CHECKBOX_IDLE_CLASS,
  ROUNDED_CHECKBOX_SIZE_CLASS,
} from "../../atoms/Checkbox/Checkbox.tsx";

/**
 * Instagram-style active treatment (spec 010 WP1): active tab = filled icon;
 * outline-style icons (search, calendar) use a bolder stroke instead of fill.
 * Targets the descendant `<svg>` directly — CSS beats lucide's `fill="none"`
 * presentation attribute, an inherited value from the `<a>` would not.
 */
export const ACTIVE_FILL = "[&.active_svg]:fill-current";
export const ACTIVE_BOLD = "[&.active_svg]:stroke-[2.5]";
/** Non-`.active`-class fallback for the browse (grid⇄list) forced-active case below. */
export const FORCE_FILL = "[&_svg]:fill-current";
/** Soft selected pill for browse when the route is `/` (no `.active` on Watch). */
export const FORCE_DOCK_ACTIVE = "text-yellow";
/** Dock-style reveal stagger; static classes keep Tailwind discovery deterministic. */
export const NAV_REVEAL_DELAYS = [
  "group-hover:delay-[0ms]",
  "group-hover:delay-[40ms]",
  "group-hover:delay-[80ms]",
] as const;

/** Attribute on `<header>` so AppEdgeBlur can listen for dock-hide hover. */
export const APP_HEADER_HOOK = "data-app-header";

/** Mobile tab hit targets — chrome is transparent; edge scrub lives in AppEdgeBlur. */
export const MOBILE_DOCK_TAB =
  "flex h-11 min-w-0 flex-1 items-center justify-center text-muted transition-[color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:active:scale-[0.92] hover:text-snow [&.active]:text-yellow";

/** E67 / E138: desktop + mobile tab bar. Library grid is a peer view of Watch (E142). */
export const NAV_ITEMS = [
  {
    to: "/watch" as const,
    key: "app.nav.watch",
    Icon: Play,
    browse: true as const,
    activeClass: ACTIVE_FILL,
  },
  {
    to: "/calendar" as const,
    key: "app.nav.calendar",
    Icon: CalendarDays,
    browse: false as const,
    activeClass: ACTIVE_BOLD,
  },
  {
    to: "/search" as const,
    key: "app.nav.search",
    Icon: Search,
    browse: false as const,
    activeClass: ACTIVE_BOLD,
  },
];

export const BARE_PATHS = new Set(["/login", "/claim"]);

export const GHOST_ICON_BUTTON_CLASS = `flex shrink-0 items-center justify-center transition-all duration-300 ${ROUNDED_CHECKBOX_SIZE_CLASS} ${ROUNDED_CHECKBOX_IDLE_CLASS}`;

/** 44px rail — centers 36px ghost controls on the same axis as the header avatar. */
export const RIGHT_RAIL_SLOT_CLASS = "flex h-11 w-11 shrink-0 items-center justify-center";

/** Navbar top-right actions — same ghost hit box, no border. */
export const HEADER_ACTION_CLASS = `flex shrink-0 items-center justify-center transition-all duration-300 ${ROUNDED_CHECKBOX_SIZE_CLASS} bg-transparent text-muted`;

/** Inner ghost icon control (rounded-checkbox idle surface). */
export const PAGE_HEADING_ACTION_CLASS = GHOST_ICON_BUTTON_CLASS;

/** Desktop page-heading trailing slot: list-inset rail + centered ghost control. */
export const PAGE_HEADING_ACTION_SLOT_CLASS = `ml-auto ${RIGHT_RAIL_SLOT_CLASS}`;

export function isBrowsePath(pathname: string): boolean {
  return pathname === "/" || pathname === "/watch";
}

export function isCalendarPath(pathname: string): boolean {
  return pathname === "/calendar" || pathname.startsWith("/calendar/");
}

export function isWatchHistoryPath(pathname: string): boolean {
  return pathname === "/watch/history";
}

/** Series detail / preview — banner dock-hide + hero bleed under transparent header (E146 / E183). */
export function isSeriesHeroPath(pathname: string): boolean {
  return pathname.startsWith("/series/");
}

/** Profile hub route (`/user/:handle`) — path only; mobile Settings gear etc. */
export function isProfileHeroPath(pathname: string): boolean {
  return /^\/user\/[^/]+$/.test(pathname);
}

/**
 * Dock-hide nav + scroll/hover edge scrub (E146 / E183).
 * Series hero always; profile hub only when a banner image is actually set.
 */
export function isBannerChromePage(
  pathname: string,
  profileBannerRef: string | null | undefined,
): boolean {
  return isSeriesHeroPath(pathname) || (isProfileHeroPath(pathname) && Boolean(profileBannerRef));
}

/** Pathname of the committed leaf match — updates inside `startViewTransition`,
 *  unlike `location.pathname` which flips earlier and would unmount / restyle
 *  chrome before the old poster/header snapshots are captured. */
export function useCommittedPathname(): string {
  return useRouterState({
    select: (s) => {
      const leaf = s.matches.at(-1)?.pathname;
      return leaf ?? s.location.pathname;
    },
  });
}

/** Re-read browse path when the route changes (toggle persists + navigate). */
export function useWatchBrowsePath(): "/" | "/watch" {
  useCommittedPathname();
  return readBrowsePath();
}

export { GanttChart, LayoutGrid, List };
