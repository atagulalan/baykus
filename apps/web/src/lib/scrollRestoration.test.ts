// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  BROWSE_SCROLL_KEY,
  CALENDAR_SCROLL_KEY,
  clearScrollRestorationKey,
  getScrollRestorationKey,
  shouldForgetBrowseScrollBeforeCalendar,
  shouldOpenBrowseAtTop,
} from "./scrollRestoration.ts";

const SCROLL_RESTORATION_STORAGE_KEY = "tsr-scroll-restoration-v1_3";

describe("getScrollRestorationKey", () => {
  it("shares browse scroll between / and /watch", () => {
    expect(getScrollRestorationKey({ pathname: "/", state: null })).toBe(BROWSE_SCROLL_KEY);
    expect(getScrollRestorationKey({ pathname: "/watch", state: null })).toBe(BROWSE_SCROLL_KEY);
  });

  it("shares calendar scroll across calendar modes", () => {
    expect(getScrollRestorationKey({ pathname: "/calendar", state: null })).toBe(
      CALENDAR_SCROLL_KEY,
    );
    expect(getScrollRestorationKey({ pathname: "/calendar/month", state: null })).toBe(
      CALENDAR_SCROLL_KEY,
    );
    expect(getScrollRestorationKey({ pathname: "/calendar/schedule", state: null })).toBe(
      CALENDAR_SCROLL_KEY,
    );
  });

  it("falls back to pathname for other routes", () => {
    expect(getScrollRestorationKey({ pathname: "/search", state: null })).toBe("/search");
  });

  it("prefers __TSR_key from location state when set", () => {
    expect(
      getScrollRestorationKey({ pathname: "/series/1", state: { __TSR_key: "detail-1" } }),
    ).toBe("detail-1");
  });
});

describe("shouldOpenBrowseAtTop", () => {
  it("is true when entering browse from any calendar route", () => {
    expect(shouldOpenBrowseAtTop("/calendar", "/watch")).toBe(true);
    expect(shouldOpenBrowseAtTop("/calendar/schedule", "/watch")).toBe(true);
    expect(shouldOpenBrowseAtTop("/calendar", "/")).toBe(true);
  });

  it("is false for other hops", () => {
    expect(shouldOpenBrowseAtTop("/calendar", "/calendar/schedule")).toBe(false);
    expect(shouldOpenBrowseAtTop("/series/1", "/watch")).toBe(false);
    expect(shouldOpenBrowseAtTop("/watch", "/")).toBe(false);
    expect(shouldOpenBrowseAtTop(undefined, "/watch")).toBe(false);
  });
});

describe("shouldForgetBrowseScrollBeforeCalendar", () => {
  it("is true when leaving either browse path for calendar", () => {
    expect(shouldForgetBrowseScrollBeforeCalendar("/watch", "/calendar")).toBe(true);
    expect(shouldForgetBrowseScrollBeforeCalendar("/", "/calendar")).toBe(true);
  });

  it("is false for non-browse departures", () => {
    expect(shouldForgetBrowseScrollBeforeCalendar("/series/1", "/calendar")).toBe(false);
  });
});

describe("clearScrollRestorationKey", () => {
  afterEach(() => {
    sessionStorage.removeItem(SCROLL_RESTORATION_STORAGE_KEY);
  });

  it("removes the bucket for the given key", () => {
    sessionStorage.setItem(
      SCROLL_RESTORATION_STORAGE_KEY,
      JSON.stringify({
        [CALENDAR_SCROLL_KEY]: { window: { scrollX: 0, scrollY: 900 } },
        browse: { window: { scrollX: 0, scrollY: 120 } },
      }),
    );

    clearScrollRestorationKey(CALENDAR_SCROLL_KEY);

    expect(JSON.parse(sessionStorage.getItem(SCROLL_RESTORATION_STORAGE_KEY) ?? "{}")).toEqual({
      browse: { window: { scrollX: 0, scrollY: 120 } },
    });
  });
});
