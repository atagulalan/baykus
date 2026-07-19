/** Shared scroll bucket for `/` and `/watch` (grid ↔ list toggle preserves scroll). */
export const BROWSE_SCROLL_KEY = "browse";

/** Shared scroll bucket for all `/calendar` routes (timeline, month, schedule). */
export const CALENDAR_SCROLL_KEY = "calendar";

export function isCalendarScrollPath(pathname: string): boolean {
  return pathname === "/calendar" || pathname.startsWith("/calendar/");
}

export function isBrowseScrollPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/watch";
}

/**
 * Calendar scroll depth must not carry into the watch/browse tab.
 * Covers both `/watch` (list) and `/` (grid) — the tab lands on whichever
 * browse view was last used.
 */
export function shouldOpenBrowseAtTop(from: string | undefined, to: string): boolean {
  return !!from && isCalendarScrollPath(from) && isBrowseScrollPath(to);
}

/** Drop saved browse scroll when leaving for calendar so return opens at top. */
export function shouldForgetBrowseScrollBeforeCalendar(
  from: string | undefined,
  to: string,
): boolean {
  return !!from && isBrowseScrollPath(from) && isCalendarScrollPath(to);
}

/** Must match TanStack Router's `storageKey` in `@tanstack/router-core`. */
const SCROLL_RESTORATION_STORAGE_KEY = "tsr-scroll-restoration-v1_3";

type ScrollRestorationCache = Record<
  string,
  Record<string, { scrollX: number; scrollY: number } | undefined> | undefined
>;

function readScrollRestorationCache(): ScrollRestorationCache {
  try {
    return JSON.parse(
      sessionStorage.getItem(SCROLL_RESTORATION_STORAGE_KEY) ?? "{}",
    ) as ScrollRestorationCache;
  } catch {
    return {};
  }
}

function writeScrollRestorationCache(cache: ScrollRestorationCache): void {
  try {
    sessionStorage.setItem(SCROLL_RESTORATION_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorage may be unavailable in private mode
  }
}

/** TanStack Router scroll-restoration bucket per route surface. */
export function getScrollRestorationKey(location: { pathname: string; state: unknown }): string {
  if (location.pathname === "/" || location.pathname === "/watch") {
    return BROWSE_SCROLL_KEY;
  }
  if (location.pathname === "/calendar" || location.pathname.startsWith("/calendar/")) {
    return CALENDAR_SCROLL_KEY;
  }
  const state = location.state as { __TSR_key?: string } | null;
  return state?.__TSR_key ?? location.pathname;
}

/** Drop a route's saved scroll so the next visit starts fresh (calendar re-anchors to BUGÜN). */
export function clearScrollRestorationKey(key: string): void {
  const cache = readScrollRestorationCache();
  if (!(key in cache)) return;
  delete cache[key];
  writeScrollRestorationCache(cache);
}

type TabScrollRouter = {
  subscribe: (
    event: "onBeforeLoad",
    fn: (event: { fromLocation?: { pathname: string }; toLocation: { pathname: string } }) => void,
  ) => () => void;
};

/**
 * Clear the browse scroll bucket when crossing the calendar ↔ browse tab edge.
 *
 * The actual scrollTo(0) lives in BrowseOrOutlet: `/` and `/watch` skip `<Outlet />`,
 * so TanStack's Match-level `onRendered` (and its scroll restoration) never runs for
 * those landings — window Y would otherwise stay at the calendar depth.
 */
export function installCalendarWatchScrollIsolation(router: TabScrollRouter): () => void {
  return router.subscribe("onBeforeLoad", (event) => {
    const from = event.fromLocation?.pathname;
    const to = event.toLocation.pathname;
    if (shouldForgetBrowseScrollBeforeCalendar(from, to) || shouldOpenBrowseAtTop(from, to)) {
      clearScrollRestorationKey(BROWSE_SCROLL_KEY);
    }
  });
}
