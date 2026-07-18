import { Outlet, useRouterState } from "@tanstack/react-router";
import type { BrowseView } from "../../../api/types.ts";
import { BrowsePage } from "../../../pages/browse/BrowsePage.tsx";
import { isBrowsePath } from "./layoutShared.ts";

/** Keeps BrowsePage mounted across `/` ↔ `/watch` so scroll + accordion state match. */
export function BrowseOrOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (isBrowsePath(pathname)) {
    const view: BrowseView = pathname === "/" ? "grid" : "list";
    return <BrowsePage view={view} />;
  }
  return <Outlet />;
}
