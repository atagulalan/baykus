import { describe, expect, it } from "vitest";
import { needsAuthRedirect } from "./authGate.ts";

describe("needsAuthRedirect", () => {
  it("does not redirect while session is unknown", () => {
    expect(needsAuthRedirect(null, "watch")).toBe(false);
  });

  it("does not redirect when authenticated", () => {
    expect(needsAuthRedirect({ authenticated: true }, "watch")).toBe(false);
    expect(needsAuthRedirect({ authenticated: true }, "login")).toBe(false);
  });

  it("redirects unauthenticated users off app routes", () => {
    expect(needsAuthRedirect({ authenticated: false }, "watch")).toBe(true);
    expect(needsAuthRedirect({ authenticated: false }, "(tabs)")).toBe(true);
    expect(needsAuthRedirect({ authenticated: false }, undefined)).toBe(true);
  });

  it("allows bare auth / smoke routes without a session", () => {
    expect(needsAuthRedirect({ authenticated: false }, "login")).toBe(false);
    expect(needsAuthRedirect({ authenticated: false }, "claim")).toBe(false);
    expect(needsAuthRedirect({ authenticated: false }, "dev")).toBe(false);
  });
});
