import { afterEach, describe, expect, it, vi } from "vitest";
import { haptic, installHaptics } from "./haptics.ts";

afterEach(() => {
  installHaptics(null);
});

describe("haptics", () => {
  it("no-ops when no driver is installed", () => {
    expect(() => haptic("selection")).not.toThrow();
  });

  it("forwards kinds to the installed driver", () => {
    const driver = vi.fn();
    installHaptics(driver);
    haptic("medium");
    haptic("warning");
    expect(driver).toHaveBeenCalledWith("medium");
    expect(driver).toHaveBeenCalledWith("warning");
    expect(driver).toHaveBeenCalledTimes(2);
  });

  it("clears the driver when installHaptics(null)", () => {
    const driver = vi.fn();
    installHaptics(driver);
    installHaptics(null);
    haptic("light");
    expect(driver).not.toHaveBeenCalled();
  });
});
