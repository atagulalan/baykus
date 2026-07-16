import { describe, expect, it } from "vitest";
import type { AuthSession } from "../api/types.ts";
import { resolveProfileParam, selfHandleParam } from "./profilePath.ts";

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return { authenticated: true, handle: null, mode: "single", ...overrides };
}

describe("resolveProfileParam (E57 resolution matrix)", () => {
  it("single mode: 'me' resolves to self (canonical, no redirect — no-loop predicate)", () => {
    const s = session({ mode: "single", handle: null });
    expect(resolveProfileParam("me", s)).toEqual({ kind: "self", canonical: "me" });
  });

  it("single mode: anything else is not-found", () => {
    const s = session({ mode: "single", handle: null });
    expect(resolveProfileParam("someone", s)).toEqual({ kind: "not-found" });
    expect(resolveProfileParam("xava", s)).toEqual({ kind: "not-found" });
  });

  it("multi mode: the session's own handle resolves to self (canonical, no redirect)", () => {
    const s = session({ mode: "multi", handle: "xava" });
    expect(resolveProfileParam("xava", s)).toEqual({ kind: "self", canonical: "xava" });
  });

  it("multi mode: 'me' replace-navigates to the canonical handle", () => {
    const s = session({ mode: "multi", handle: "xava" });
    expect(resolveProfileParam("me", s)).toEqual({ kind: "redirect", canonical: "xava" });
  });

  it("multi mode: a foreign handle is not-found (no redirect — public profiles are future work)", () => {
    const s = session({ mode: "multi", handle: "xava" });
    expect(resolveProfileParam("someone-else", s)).toEqual({ kind: "not-found" });
  });

  it("multi mode without a handle yet: everything is not-found", () => {
    const s = session({ mode: "multi", handle: null });
    expect(resolveProfileParam("me", s)).toEqual({ kind: "not-found" });
    expect(resolveProfileParam("xava", s)).toEqual({ kind: "not-found" });
  });
});

describe("selfHandleParam", () => {
  it("single mode is always 'me'", () => {
    expect(selfHandleParam(session({ mode: "single", handle: null }))).toBe("me");
  });

  it("multi mode is the session handle", () => {
    expect(selfHandleParam(session({ mode: "multi", handle: "xava" }))).toBe("xava");
  });
});
