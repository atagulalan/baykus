import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedButtonGroup } from "./SegmentedButtonGroup.tsx";

const options = [
  { value: "week" as const, label: "Week" },
  { value: "month" as const, label: "Month" },
  { value: "schedule" as const, label: "Schedule", disabled: true },
];

describe("SegmentedButtonGroup", () => {
  it("marks the selected option with aria-pressed=true", () => {
    render(<SegmentedButtonGroup options={options} value="week" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange when selecting a different option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedButtonGroup options={options} value="week" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("does not call onChange for the already-selected option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedButtonGroup options={options} value="week" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Week" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when clicking a disabled option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedButtonGroup options={options} value="week" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Schedule" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
