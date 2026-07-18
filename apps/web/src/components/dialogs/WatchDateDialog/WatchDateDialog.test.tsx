import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WatchDateDialog } from "./WatchDateDialog.tsx";

describe("WatchDateDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-15T14:30:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies the now preset when clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <WatchDateDialog
        initialValue="2020-01-01T10:00:00.000Z"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Şimdi" }));

    expect(screen.getByDisplayValue("2026-07-15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("14:30")).toBeInTheDocument();
  });

  it("applies the yesterday preset when clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <WatchDateDialog
        initialValue="2020-01-01T10:00:00.000Z"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Dün" }));

    expect(screen.getByDisplayValue("2026-07-14")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20:00")).toBeInTheDocument();
  });

  it("calls onConfirm with an ISO datetime string", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onConfirm = vi.fn();
    render(
      <WatchDateDialog
        initialValue="2026-03-10T08:15:00.000Z"
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    const iso = onConfirm.mock.calls[0]?.[0] as string;
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});
