import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";
import { Checkbox } from "./Checkbox.tsx";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

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
    expect(onChange).toHaveBeenCalledWith(true, expect.anything());
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

  it("renders the rounded variant outlined when unchecked and filled when checked", () => {
    const { rerender } = render(
      <Checkbox checked={false} onChange={() => {}} variant="rounded" aria-label="Mark watched" />,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Mark watched" });
    expect(checkbox).toHaveClass("rounded-full");
    expect(checkbox).toHaveClass("h-9");
    expect(checkbox).toHaveClass("w-9");
    expect(checkbox).toHaveClass("border-white/20");
    expect(checkbox).toHaveClass("bg-transparent");
    expect(checkbox).toHaveClass("text-muted");

    rerender(<Checkbox checked onChange={() => {}} variant="rounded" aria-label="Mark watched" />);
    expect(checkbox).toHaveClass("border-0");
    expect(checkbox).toHaveClass("bg-green-500/12");
    expect(checkbox).toHaveClass("text-green-500");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Checkbox checked={false} onChange={() => {}} aria-label="Mark watched" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
