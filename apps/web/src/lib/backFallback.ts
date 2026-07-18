/**
 * E72 / E138 / E142: which routes get the mobile-only back arrow, and — when there's no
 * in-app history — which parent they fall back to.
 * Tab / browse surfaces (`/watch`, `/` grid view, `/calendar`…, `/search`, `/user/$handle`)
 * never get the arrow. `/` is a peer view of Watch (header toggle), not a child page.
 */
export type BackFallback =
  | { to: "/watch" }
  | { to: "/settings" }
  | { to: "/user/$handle"; params: { handle: string } };

const RULES: {
  test: (pathname: string) => boolean;
  fallback: (selfHandle: string) => BackFallback;
}[] = [
  { test: (p) => p.startsWith("/series/"), fallback: () => ({ to: "/watch" }) },
  // Spec 010 WP2: history is a child page of Watch, not a tab of its own.
  { test: (p) => p === "/watch/history", fallback: () => ({ to: "/watch" }) },
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
