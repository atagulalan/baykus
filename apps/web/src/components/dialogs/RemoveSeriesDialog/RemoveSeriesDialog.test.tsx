import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RemoveSeriesDialog } from "./RemoveSeriesDialog.tsx";

describe("RemoveSeriesDialog", () => {
  it("shows the series title in the confirmation message", () => {
    render(<RemoveSeriesDialog title="Breaking Bad" onConfirm={() => {}} onClose={() => {}} />);
    expect(screen.getByText('"Breaking Bad" kütüphaneden kaldırılsın mı?')).toBeInTheDocument();
  });

  it("calls onConfirm and onClose when confirmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<RemoveSeriesDialog title="Breaking Bad" onConfirm={onConfirm} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Kaldır" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
