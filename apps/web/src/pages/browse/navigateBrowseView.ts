import type { NavigateOptions } from "@tanstack/react-router";
import type { BrowseView } from "../../api/types.ts";
import { clearLastPosterItemId } from "../../lib/posterTransition.ts";
import { updateUiPrefs } from "../../lib/uiPrefs.ts";

type BrowseNavigate = (options: NavigateOptions) => void | Promise<void>;

/**
 * Persist list↔grid choice and navigate — BrowsePage stays mounted across the hop.
 * No view transition: swapping the full poster grid ↔ row list inside
 * `startViewTransition` freezes `app-main` while the browser snapshots every
 * image, which feels like a multi-second hang (or a missed tap).
 */
export function navigateBrowseView(navigate: BrowseNavigate, view: BrowseView): void {
  updateUiPrefs({ browseView: view });
  clearLastPosterItemId();
  void navigate({
    to: view === "grid" ? "/" : "/watch",
    resetScroll: false,
  });
}
