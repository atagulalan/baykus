import { track } from "./telemetry.ts";

type RouteMatchLike = {
  fullPath?: string;
  routeId?: string;
};

type RouterLike = {
  subscribe: (event: "onResolved", cb: () => void) => () => void;
  state: { matches: readonly RouteMatchLike[] };
};

/**
 * Emit page_view with the matched route pattern (e.g. `/series/$id`), never
 * concrete ids (E196).
 */
export function installPageViewTracking(router: RouterLike): void {
  let lastRoute: string | undefined;
  router.subscribe("onResolved", () => {
    const leaf = router.state.matches.at(-1);
    const route = leaf?.fullPath ?? leaf?.routeId ?? "unknown";
    if (route === lastRoute) return;
    lastRoute = route;
    track("page_view", { route });
  });
}
