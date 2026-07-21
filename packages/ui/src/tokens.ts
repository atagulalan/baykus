/**
 * Baykuş design tokens — shared source of truth for NativeWind (mobile) and
 * the web `@theme` block in `apps/web/src/index.css`. Keep hex values in sync.
 */

export const colors = {
  void: "#080808",
  snow: "#ebebeb",
  muted: "#888888",
  mutedDim: "#848484",
  yellow: "#f0e000",
} as const;

export const fonts = {
  display: "DM Serif Display",
  sans: "DM Sans",
  mono: "JetBrains Mono",
} as const;

/** Layout helpers matching web `.content-inset` / `.list-inset` / `.page-top` (base size). */
export const space = {
  contentInset: 12,
  contentInsetSm: 24,
  listInset: 8,
  listInsetSm: 16,
  pageTop: 32,
} as const;
