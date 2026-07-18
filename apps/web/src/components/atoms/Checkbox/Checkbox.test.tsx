import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox.tsx";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox checked={false} onChange={() => {}} aria-label="Mark watched" />);
    expect(screen.getByRole("checkbox", { name: "Mark watched" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onChange with toggled value when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} aria-label="Mark watched" />);
    await user.click(screen.getByRole("checkbox", { name: "Mark watched" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} disabled aria-label="Mark watched" />);
    await user.click(screen.getByRole("checkbox", { name: "Mark watched" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reflects checked state", () => {
    render(<Checkbox checked onChange={() => {}} aria-label="Mark watched" />);
    expect(screen.getByRole("checkbox", { name: "Mark watched" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
