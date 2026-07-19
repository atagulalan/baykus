// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unairedTrailingState } from "./airDateLabel.ts";
import { useAiringClock } from "./useAiringClock.ts";

describe("useAiringClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances every second in the last minute", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T00:00:00.000Z"));

    const { result } = renderHook(() =>
      useAiringClock("2026-07-19", "2026-07-19T00:00:05.000Z", true),
    );

    expect(
      unairedTrailingState("2026-07-19", undefined, "2026-07-19T00:00:05.000Z", result.current),
    ).toEqual({
      kind: "countdownSeconds",
      seconds: 5,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(
      unairedTrailingState("2026-07-19", undefined, "2026-07-19T00:00:05.000Z", result.current),
    ).toEqual({
      kind: "countdownSeconds",
      seconds: 4,
    });

    for (let step = 0; step < 4; step++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
    }
    expect(
      unairedTrailingState("2026-07-19", undefined, "2026-07-19T00:00:05.000Z", result.current),
    ).toEqual({
      kind: "none",
    });
  });

  it("does not schedule ticks when disabled", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T00:00:00.000Z"));

    const { result } = renderHook(() =>
      useAiringClock("2026-07-19", "2026-07-19T00:00:05.000Z", false),
    );
    const initial = result.current;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current).toBe(initial);
  });
});
