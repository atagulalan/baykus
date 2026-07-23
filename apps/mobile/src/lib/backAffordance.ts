/**
 * Which inner routes get a chrome back arrow, and where to go when
 * `router.canGoBack()` is false. Mirrors web `backFallback.ts` for Expo paths.
 */
export type MobileBackFallback = "/(tabs)/watch" | "/(tabs)/settings" | "/(tabs)/profile";

const RULES: Array<{
  test: (pathname: string) => boolean;
  fallback: MobileBackFallback;
}> = [
  { test: (p) => p.startsWith("/series/"), fallback: "/(tabs)/watch" },
  { test: (p) => p === "/watch/history", fallback: "/(tabs)/watch" },
  { test: (p) => p === "/import", fallback: "/(tabs)/settings" },
  // Hidden tab — no dock back chrome unless Wordmark special-cases this path.
  { test: (p) => p === "/settings", fallback: "/(tabs)/profile" },
  {
    test: (p) => p.startsWith("/library/") || p === "/profile/stats",
    fallback: "/(tabs)/profile",
  },
];

/** Returns a fallback href when the route should show a back control; else null. */
export function mobileBackAffordance(pathname: string): MobileBackFallback | null {
  for (const rule of RULES) {
    if (rule.test(pathname)) return rule.fallback;
  }
  return null;
}
