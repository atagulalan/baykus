import { describe, expect, it, beforeEach } from "vitest";
import {
  peekNavBack,
  recordNavBackTransition,
  resetNavBackStackForTests,
} from "./navBackStack.ts";

const watch = { href: "/watch", pathname: "/watch" };
const series = { href: "/series/i1", pathname: "/series/i1" };
const calendar = { href: "/calendar", pathname: "/calendar" };
const settings = { href: "/settings", pathname: "/settings" };

describe("navBackStack", () => {
  beforeEach(() => {
    resetNavBackStackForTests();
  });

  it("records forward push navigations", () => {
    recordNavBackTransition(
      { fromLocation: watch, toLocation: series, hrefChanged: true },
      "PUSH",
    );
    expect(peekNavBack()).toBe("/watch");
  });

  it("ignores replace navigations", () => {
    recordNavBackTransition(
      { fromLocation: watch, toLocation: series, hrefChanged: true },
      "REPLACE",
    );
    expect(peekNavBack()).toBeUndefined();
  });

  it("pops when returning via in-app back (push to stack top)", () => {
    recordNavBackTransition(
      { fromLocation: watch, toLocation: series, hrefChanged: true },
      "PUSH",
    );
    recordNavBackTransition(
      { fromLocation: series, toLocation: watch, hrefChanged: true },
      "PUSH",
    );
    expect(peekNavBack()).toBeUndefined();
  });

  it("pops when returning via browser back", () => {
    recordNavBackTransition(
      { fromLocation: watch, toLocation: series, hrefChanged: true },
      "PUSH",
    );
    recordNavBackTransition(
      { fromLocation: series, toLocation: watch, hrefChanged: true },
      "BACK",
    );
    expect(peekNavBack()).toBeUndefined();
  });

  it("restores stack on browser forward", () => {
    recordNavBackTransition(
      { fromLocation: watch, toLocation: series, hrefChanged: true },
      "PUSH",
    );
    recordNavBackTransition(
      { fromLocation: series, toLocation: watch, hrefChanged: true },
      "BACK",
    );
    recordNavBackTransition(
      { fromLocation: watch, toLocation: series, hrefChanged: true },
      "FORWARD",
    );
    expect(peekNavBack()).toBe("/watch");
  });

  it("tracks multi-hop chains", () => {
    recordNavBackTransition(
      { fromLocation: watch, toLocation: series, hrefChanged: true },
      "PUSH",
    );
    recordNavBackTransition(
      { fromLocation: series, toLocation: settings, hrefChanged: true },
      "PUSH",
    );
    expect(peekNavBack()).toBe("/series/i1");

    recordNavBackTransition(
      { fromLocation: settings, toLocation: series, hrefChanged: true },
      "PUSH",
    );
    expect(peekNavBack()).toBe("/watch");
  });

  it("ignores same-href transitions", () => {
    recordNavBackTransition(
      { fromLocation: calendar, toLocation: calendar, hrefChanged: false },
      "PUSH",
    );
    expect(peekNavBack()).toBeUndefined();
  });
});
