import { Outlet } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import type { BrowseView } from "../../../api/types.ts";
import { shouldOpenBrowseAtTop } from "../../../lib/scrollRestoration.ts";
import { BrowsePage } from "../../../pages/browse/BrowsePage.tsx";
import { isBrowsePath, useCommittedPathname } from "./layoutShared.ts";

/**
 * Keeps BrowsePage mounted across `/` ↔ `/watch` so scroll + accordion state match.
 *
 * Must key off committed route matches — not `location.pathname`. Location updates
 * before `startViewTransition` captures the old tree; switching on pathname would
 * unmount the library grid (and its armed `poster-${id}`) before the morph runs.
 * Matches are swapped inside the VT update callback, so the poster is still in the
 * old snapshot. Profile → detail works via `<Outlet />` for the same reason.
 *
 * Calendar → browse: force window top. Browse routes render via this branch (not
 * `<Outlet />`), so TanStack Match `onRendered` scroll restoration never fires and
 * calendar scroll depth would otherwise stick.
 */
export function BrowseOrOutlet() {
  const pathname = useCommittedPathname();
  const prevPathRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const from = prevPathRef.current;
    prevPathRef.current = pathname;
    if (shouldOpenBrowseAtTop(from, pathname)) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  if (isBrowsePath(pathname)) {
    const view: BrowseView = pathname === "/" ? "grid" : "list";
    return <BrowsePage view={view} />;
  }
  return <Outlet />;
}
