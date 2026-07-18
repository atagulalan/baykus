import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UnwatchSeasonDialog } from "./UnwatchSeasonDialog.tsx";

describe("UnwatchSeasonDialog", () => {
  it("calls onConfirm and onClose when confirmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<UnwatchSeasonDialog onConfirm={onConfirm} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Evet, sil" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
