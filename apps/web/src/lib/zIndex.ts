/**
 * App-wide stacking scale. Use these instead of one-off z-* / z-[N] values so
 * overlays, chrome, and sticky headers stay ordered.
 *
 * Low → high (product stack):
 *   page/content < sticky < edgeBlur < chrome < overlay < overlayPanel < toast
 *   < grain (body::after, CSS z-index 1e7 — above everything)
 *
 * Prefer `style={{ zIndex: Z.* }}` for portals/overlays (always applied).
 * Tailwind `z-*` utilities are fine for in-flow content when they match this table.
 */
export const Z = {
  /** In-hero content above backdrop; rating micro-prompts. */
  content: 10,
  /** Sticky section headers, calendar mode chrome, filter FAB — page layer. */
  sticky: 30,
  /** Viewport edge scrubs (under header/tab bar, above page). */
  edgeBlur: 35,
  /** App header + mobile tab bar (icons only — no edge fade painted here). */
  chrome: 40,
  /** Modal / popover / sheet backdrop (portaled to body). */
  overlay: 100,
  /** Modal / popover / sheet panel above its backdrop. */
  overlayPanel: 110,
  /** Toasts above every dialog. */
  toast: 120,
} as const;

export type ZLayer = keyof typeof Z;
