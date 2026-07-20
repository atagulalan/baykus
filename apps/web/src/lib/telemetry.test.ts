import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn((fn: (scope: { setTag: () => void }) => void) => fn({ setTag: vi.fn() })),
}));

describe("telemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a no-op when VITE_SENTRY_DSN is unset", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    const Sentry = await import("@sentry/react");
    const { initTelemetry, track, captureError, isTelemetryEnabled } = await import(
      "./telemetry.ts"
    );
    initTelemetry();
    expect(isTelemetryEnabled()).toBe(false);
    track("page_view", { route: "/" });
    captureError(new Error("boom"));
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("tracks and captures when DSN is set", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://example@sentry.test/1");
    const Sentry = await import("@sentry/react");
    const { initTelemetry, track, captureError, isTelemetryEnabled } = await import(
      "./telemetry.ts"
    );
    initTelemetry();
    expect(isTelemetryEnabled()).toBe(true);
    expect(Sentry.init).toHaveBeenCalled();
    track("page_view", { route: "/series/$id" });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "page_view",
      expect.objectContaining({
        level: "info",
        fingerprint: ["analytics", "page_view"],
      }),
    );
    captureError(new Error("boom"), { status: 500 });
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
