import { describe, expect, it } from "vitest";
import { isProviderError, ProviderError } from "./errors.ts";

describe("ProviderError", () => {
  it("carries provider id, code and retryAfterMs", () => {
    const e = new ProviderError("tvmaze", "RATE_LIMITED", "too many requests", {
      retryAfterMs: 5000,
    });
    expect(e.message).toBe("[tvmaze] RATE_LIMITED: too many requests");
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.providerId).toBe("tvmaze");
    expect(e.retryAfterMs).toBe(5000);
    expect(isProviderError(e)).toBe(true);
    expect(isProviderError(new Error("x"))).toBe(false);
  });
});
