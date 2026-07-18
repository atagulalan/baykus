import { useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  GanttChart,
  LayoutGrid,
  List,
  Play,
  Search,
} from "lucide-react";
import { readBrowsePath } from "../../../lib/uiPrefs.ts";

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
/** Dock-style reveal stagger; static classes keep Tailwind discovery deterministic. */
export const NAV_REVEAL_DELAYS = [
  "group-hover:delay-[0ms]",
  "group-hover:delay-[40ms]",
  "group-hover:delay-[80ms]",
] as const;

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

export const HEADER_ACTION_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-snow";

/** Desktop page-heading trailing control: 36px hit target, 20px icon — -mr-2
 * cancels the 8px centering gap (Watch, Library, Watch History, …). */
export const PAGE_HEADING_ACTION_CLASS =
  "ml-auto -mr-2 flex h-9 w-9 shrink-0 items-center justify-center text-muted transition-colors hover:text-snow";

export function isBrowsePath(pathname: string): boolean {
  return pathname === "/" || pathname === "/watch";
}

export function isCalendarPath(pathname: string): boolean {
  return pathname === "/calendar" || pathname.startsWith("/calendar/");
}

export function isWatchHistoryPath(pathname: string): boolean {
  return pathname === "/watch/history";
}

export function isPullToRefreshPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/watch" ||
    pathname === "/calendar" ||
    pathname.startsWith("/calendar/") ||
    pathname.endsWith("/all-series") ||
    pathname.endsWith("/favorites") ||
    pathname === "/watch/history"
  );
}

/** E146: series detail hero starts at viewport top beneath the transparent header. */
export function isSeriesHeroPath(pathname: string): boolean {
  return pathname.startsWith("/series/") && pathname !== "/series/new";
}

/** Profile banner uses the same under-header bleed as the series hero. */
export function isProfileHeroPath(pathname: string): boolean {
  return /^\/user\/[^/]+$/.test(pathname);
}

/** Re-read browse path when the route changes (toggle persists + navigate). */
export function useWatchBrowsePath(): "/" | "/watch" {
  useRouterState({ select: (s) => s.location.pathname });
  return readBrowsePath();
}

export { GanttChart, LayoutGrid, List };
