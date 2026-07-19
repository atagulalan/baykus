import type { NavigateOptions } from "@tanstack/react-router";
import type { BrowseView } from "../../api/types.ts";
import { pageViewTransition } from "../../lib/pageViewTransition.ts";
import { clearLastPosterItemId } from "../../lib/posterTransition.ts";
import { updateUiPrefs } from "../../lib/uiPrefs.ts";

type BrowseNavigate = (options: NavigateOptions) => void | Promise<void>;

/** Persist list↔grid choice and navigate — BrowsePage stays mounted across the hop. */
export function navigateBrowseView(navigate: BrowseNavigate, view: BrowseView): void {
  updateUiPrefs({ browseView: view });
  clearLastPosterItemId();
  void navigate({
    to: view === "grid" ? "/" : "/watch",
    resetScroll: false,
    viewTransition: pageViewTransition,
  });
}
