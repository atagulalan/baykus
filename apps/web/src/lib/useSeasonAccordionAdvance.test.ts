// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pinSeasonHeader, seasonAnchorSelector } from "./useSeasonAccordionAdvance.ts";

describe("seasonAnchorSelector", () => {
  it("targets the season root data attribute", () => {
    expect(seasonAnchorSelector(2)).toBe('[data-season-number="2"]');
    expect(seasonAnchorSelector(0)).toBe('[data-season-number="0"]');
  });
});

describe("pinSeasonHeader", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollBy", vi.fn());
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no-ops when the season anchor is missing", () => {
    expect(pinSeasonHeader(3)).toBe(0);
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it("scrolls by strength × error toward scroll-margin-top", () => {
    const el = document.createElement("div");
    el.setAttribute("data-season-number", "2");
    el.style.scrollMarginTop = "80px";
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: 200,
      bottom: 240,
      left: 0,
      right: 0,
      width: 0,
      height: 40,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    });

    // delta = 200 - 80 = 120; strength 0.5 → scroll 60
    const remaining = pinSeasonHeader(2, 0.5);
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 60, left: 0, behavior: "instant" });
    // mock rect doesn't change after scroll — remaining still full error
    expect(remaining).toBe(120);
  });

  it("skips scrollBy when already within 0.5px", () => {
    const el = document.createElement("div");
    el.setAttribute("data-season-number", "1");
    el.style.scrollMarginTop = "80px";
    document.body.appendChild(el);

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      top: 80.2,
      bottom: 120,
      left: 0,
      right: 0,
      width: 0,
      height: 40,
      x: 0,
      y: 80.2,
      toJSON: () => ({}),
    });

    expect(pinSeasonHeader(1, 1)).toBe(0);
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it("credits collapsing leave panel above target so it does not scroll down first", () => {
    const leave = document.createElement("div");
    leave.setAttribute("data-season-number", "7");
    const panel = document.createElement("div");
    panel.setAttribute("data-slot", "accordion-panel");
    leave.appendChild(panel);
    document.body.appendChild(leave);

    const target = document.createElement("div");
    target.setAttribute("data-season-number", "8");
    target.style.scrollMarginTop = "80px";
    document.body.appendChild(target);

    vi.spyOn(leave, "getBoundingClientRect").mockReturnValue({
      top: -200,
      bottom: 700,
      left: 0,
      right: 0,
      width: 0,
      height: 900,
      x: 0,
      y: -200,
      toJSON: () => ({}),
    });
    vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 900,
      left: 0,
      right: 0,
      width: 0,
      height: 900,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 660,
      bottom: 700,
      left: 0,
      right: 0,
      width: 0,
      height: 40,
      x: 0,
      y: 660,
      toJSON: () => ({}),
    });

    // rawDelta = 660-80 = 580; layoutCredit = 900 → delta = -320 → scroll up
    pinSeasonHeader(8, 1, 7);
    expect(window.scrollBy).toHaveBeenCalledWith({ top: -320, left: 0, behavior: "instant" });
  });
});
