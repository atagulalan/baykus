import { describe, expect, it } from "vitest";
import { cubicBezier, durationFromSpeed, resolveEasing } from "./easing.ts";

describe("durationFromSpeed", () => {
  it("derives ms from distance / speed", () => {
    expect(durationFromSpeed(1400, 1400)).toBe(1000);
    expect(durationFromSpeed(700, 1400)).toBe(500);
  });

  it("clamps to min/max", () => {
    expect(durationFromSpeed(10, 1400, 120, 520)).toBe(120);
    expect(durationFromSpeed(5000, 1400, 120, 520)).toBe(520);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(durationFromSpeed(0, 1400)).toBe(0);
    expect(durationFromSpeed(100, 0)).toBe(0);
  });
});

describe("resolveEasing", () => {
  it("maps linear endpoints", () => {
    const ease = resolveEasing("linear");
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBe(0.5);
  });

  it("easeOutCubic starts fast and ends soft", () => {
    const ease = resolveEasing("easeOutCubic");
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    // Out-cubic is ahead of linear in the first half.
    expect(ease(0.5)).toBeGreaterThan(0.5);
  });

  it("accepts a custom function", () => {
    const ease = resolveEasing((t) => t * t);
    expect(ease(0.5)).toBe(0.25);
  });

  it("accepts cubic-bezier control points", () => {
    const ease = resolveEasing({ x1: 0, y1: 0, x2: 1, y2: 1 });
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5, 2);
  });
});

describe("cubicBezier", () => {
  it("matches CSS ease-out endpoints and overshoots linear mid", () => {
    const ease = cubicBezier(0.16, 1, 0.3, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.4)).toBeGreaterThan(0.4);
  });
});
