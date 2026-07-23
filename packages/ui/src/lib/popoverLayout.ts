/** Preferred placement relative to the trigger (web Modal `popoverAlign` parity). */
export type PopoverAlign = "end" | "center" | "end-top" | "end-middle";

export type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PopoverLayout = {
  top: number;
  left: number;
  width: number;
};

export const POPOVER_WIDTH = 224;
export const POPOVER_GAP = 4;
export const POPOVER_EDGE = 8;

/**
 * Anchor a compact menu panel near `rect`, flipping above / to the opposite
 * side when the preferred placement would leave the panel off-screen.
 */
export function computePopoverLayout(
  rect: AnchorRect,
  align: PopoverAlign,
  windowWidth: number,
  windowHeight: number,
  panelHeight: number,
  panelWidth: number = POPOVER_WIDTH,
): PopoverLayout {
  const width = Math.min(panelWidth, Math.max(0, windowWidth - POPOVER_EDGE * 2));
  const height = Math.max(0, Math.min(panelHeight, windowHeight - POPOVER_EDGE * 2));

  let top: number;
  let left: number;

  if (align === "end-top" || align === "end-middle") {
    // Prefer just left of the anchor (inward from a trailing control).
    left = rect.x - width - POPOVER_GAP;
    if (left < POPOVER_EDGE) {
      left = rect.x + rect.width + POPOVER_GAP;
    }
    top = align === "end-middle" ? rect.y + rect.height / 2 - height / 2 : rect.y;
  } else {
    // `end` / `center` — prefer below the anchor; flip above when needed.
    const below = rect.y + rect.height + POPOVER_GAP;
    const above = rect.y - POPOVER_GAP - height;
    const spaceBelow = windowHeight - POPOVER_EDGE - below;
    const spaceAbove = rect.y - POPOVER_EDGE - POPOVER_GAP;
    const fitsBelow = height <= spaceBelow;
    const fitsAbove = height <= spaceAbove;
    if (fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove)) {
      top = below;
    } else {
      top = above;
    }

    if (align === "center") {
      left = rect.x + rect.width / 2 - width / 2;
    } else {
      // `end` — trailing edge aligned with the trigger.
      left = rect.x + rect.width - width;
    }
  }

  left = Math.max(POPOVER_EDGE, Math.min(left, windowWidth - width - POPOVER_EDGE));
  top = Math.max(POPOVER_EDGE, Math.min(top, windowHeight - height - POPOVER_EDGE));

  return { top, left, width };
}
