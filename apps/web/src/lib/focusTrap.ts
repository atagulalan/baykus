const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Returns tabbable descendants of `root`. Visibility is not checked — jsdom reports zero-sized rects. */
export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.tabIndex !== -1 && !el.hasAttribute("disabled"),
  );
}

/** Keeps Tab / Shift+Tab cycling within `container`. */
export function handleFocusTrapKeyDown(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Focus the first tabbable element inside `root`, or the root itself. */
export function focusInitialElement(root: HTMLElement): void {
  const focusable = getFocusableElements(root);
  if (focusable.length > 0) {
    focusable[0]?.focus();
    return;
  }
  if (root.tabIndex < 0) {
    root.tabIndex = -1;
  }
  root.focus();
}
