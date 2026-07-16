/**
 * E72: which routes get the mobile-only back arrow, and — when there's no in-app
 * history to go back through (deep link / fresh tab) — which parent they fall back to.
 * The five tab pages (`/`, `/watch`, `/calendar`, `/search`, `/user/$handle`) never get
 * the arrow; everything with no tab-bar entry of its own does. Shaped to match
 * TanStack Router's typed `navigate({ to, params })` call directly.
 */
export type BackFallback =
  | { to: "/" }
  | { to: "/settings" }
  | { to: "/user/$handle"; params: { handle: string } };

const RULES: {
  test: (pathname: string) => boolean;
  fallback: (selfHandle: string) => BackFallback;
}[] = [
  { test: (p) => p.startsWith("/series/"), fallback: () => ({ to: "/" }) },
  { test: (p) => p === "/import", fallback: () => ({ to: "/settings" }) },
  {
    test: (p) => p === "/settings",
    fallback: (h) => ({ to: "/user/$handle", params: { handle: h } }),
  },
  {
    test: (p) => /^\/user\/[^/]+\/(all-series|stats|favorites)$/.test(p),
    fallback: (h) => ({ to: "/user/$handle", params: { handle: h } }),
  },
];

export function backAffordance(pathname: string, selfHandle: string): BackFallback | null {
  for (const rule of RULES) {
    if (rule.test(pathname)) return rule.fallback(selfHandle);
  }
  return null;
}
