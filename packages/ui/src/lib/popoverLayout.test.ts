import { describe, expect, it } from "vitest";
import { computePopoverLayout, POPOVER_EDGE, POPOVER_GAP, POPOVER_WIDTH } from "./popoverLayout.ts";

const WIN = { w: 800, h: 600 };
const PANEL_H = 200;

describe("computePopoverLayout", () => {
  it("places an end popover below a mid-screen anchor, trailing-aligned", () => {
    const rect = { x: 500, y: 100, width: 40, height: 40 };
    const pos = computePopoverLayout(rect, "end", WIN.w, WIN.h, PANEL_H);
    expect(pos.width).toBe(POPOVER_WIDTH);
    expect(pos.top).toBe(rect.y + rect.height + POPOVER_GAP);
    expect(pos.left).toBe(rect.x + rect.width - POPOVER_WIDTH);
  });

  it("flips an end popover above when near the bottom edge", () => {
    const rect = { x: 500, y: 520, width: 40, height: 40 };
    const pos = computePopoverLayout(rect, "end", WIN.w, WIN.h, PANEL_H);
    expect(pos.top).toBe(rect.y - POPOVER_GAP - PANEL_H);
    expect(pos.top).toBeGreaterThanOrEqual(POPOVER_EDGE);
    expect(pos.top + PANEL_H).toBeLessThanOrEqual(WIN.h - POPOVER_EDGE);
  });

  it("opens below when there is more room under a high anchor", () => {
    const rect = { x: 100, y: 40, width: 40, height: 40 };
    const pos = computePopoverLayout(rect, "center", WIN.w, WIN.h, PANEL_H);
    expect(pos.top).toBe(rect.y + rect.height + POPOVER_GAP);
  });

  it("centers horizontally and clamps to the left edge", () => {
    const rect = { x: 10, y: 100, width: 20, height: 20 };
    const pos = computePopoverLayout(rect, "center", WIN.w, WIN.h, PANEL_H);
    expect(pos.left).toBe(POPOVER_EDGE);
  });

  it("clamps a trailing end popover that would overflow the right edge", () => {
    const rect = { x: 780, y: 100, width: 40, height: 40 };
    const pos = computePopoverLayout(rect, "end", WIN.w, WIN.h, PANEL_H);
    expect(pos.left + pos.width).toBeLessThanOrEqual(WIN.w - POPOVER_EDGE);
  });

  it("places end-top to the left, flipping right when near the left edge", () => {
    const nearLeft = { x: 20, y: 200, width: 32, height: 32 };
    const flipped = computePopoverLayout(nearLeft, "end-top", WIN.w, WIN.h, PANEL_H);
    expect(flipped.left).toBe(nearLeft.x + nearLeft.width + POPOVER_GAP);

    const mid = { x: 400, y: 200, width: 32, height: 32 };
    const leftOf = computePopoverLayout(mid, "end-top", WIN.w, WIN.h, PANEL_H);
    expect(leftOf.left).toBe(mid.x - POPOVER_WIDTH - POPOVER_GAP);
    expect(leftOf.top).toBe(mid.y);
  });

  it("vertically centers end-middle and clamps near the bottom", () => {
    const rect = { x: 400, y: 520, width: 32, height: 32 };
    const pos = computePopoverLayout(rect, "end-middle", WIN.w, WIN.h, PANEL_H);
    expect(pos.top).toBe(WIN.h - PANEL_H - POPOVER_EDGE);
    expect(pos.top + PANEL_H).toBeLessThanOrEqual(WIN.h - POPOVER_EDGE);
  });

  it("keeps the panel fully on-screen even when taller than free space", () => {
    const rect = { x: 400, y: 300, width: 40, height: 40 };
    const tall = 500;
    const pos = computePopoverLayout(rect, "end", WIN.w, WIN.h, tall);
    expect(pos.top).toBeGreaterThanOrEqual(POPOVER_EDGE);
    expect(pos.top + Math.min(tall, WIN.h - POPOVER_EDGE * 2)).toBeLessThanOrEqual(
      WIN.h - POPOVER_EDGE,
    );
  });
});
