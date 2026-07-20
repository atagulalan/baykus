import type { NavigateOptions } from "@tanstack/react-router";
import type { BackFallback } from "./backFallback.ts";
import { pageViewTransition } from "./pageViewTransition.ts";

/** In-app back stack — mobile back uses this instead of `window.history.back()`. */
const stack: string[] = [];

type NavBackLocation = {
  href: string;
  pathname: string;
};

type NavBackTransition = {
  fromLocation?: NavBackLocation;
  toLocation: NavBackLocation;
  hrefChanged: boolean;
};

type HistoryActionType = "PUSH" | "REPLACE" | "BACK" | "FORWARD" | "GO";

let pendingHistoryAction: HistoryActionType | null = null;

export function peekNavBack(): string | undefined {
  return stack.at(-1);
}

/** Test hook — records a navigation for the mobile back stack. */
export function recordNavBackTransition(
  event: NavBackTransition,
  action: HistoryActionType | null,
): void {
  const { fromLocation, toLocation, hrefChanged } = event;
  if (!hrefChanged || !fromLocation) return;

  const returningToStackTop =
    stack.length > 0 && stack[stack.length - 1] === toLocation.href;

  if (action === "BACK" || action === "GO") {
    if (returningToStackTop) stack.pop();
    return;
  }

  if (returningToStackTop) {
    stack.pop();
    return;
  }

  if (action === "REPLACE") return;

  if (action === "FORWARD") {
    stack.push(fromLocation.href);
    return;
  }

  stack.push(fromLocation.href);
}

export function navigateMobileBack(
  navigate: (options: NavigateOptions) => void | Promise<unknown>,
  fallback: BackFallback,
): void {
  const target = peekNavBack();
  if (target) {
    void navigate({ href: target, viewTransition: pageViewTransition });
    return;
  }
  void navigate({ ...fallback, viewTransition: pageViewTransition });
}

type NavBackRouter = {
  history: {
    subscribe: (fn: (event: { action: { type: HistoryActionType } }) => void) => () => void;
  };
  subscribe: (
    event: "onBeforeLoad",
    fn: (event: NavBackTransition) => void,
  ) => () => void;
};

export function installNavBackStack(router: NavBackRouter): () => void {
  const unsubHistory = router.history.subscribe(({ action }) => {
    pendingHistoryAction = action.type;
  });
  const unsubRouter = router.subscribe("onBeforeLoad", (event) => {
    const action = pendingHistoryAction;
    pendingHistoryAction = null;
    recordNavBackTransition(event, action);
  });
  return () => {
    unsubHistory();
    unsubRouter();
  };
}

/** Test hook — reset module state between unit tests. */
export function resetNavBackStackForTests(): void {
  stack.length = 0;
  pendingHistoryAction = null;
}
