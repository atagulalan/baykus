import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { RatingControl } from "./RatingControl.tsx";

describe("RatingControl", () => {
  it("renders three rating options", () => {
    renderWithProviders(<RatingControl value={null} onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("sets aria-pressed on the active rating", () => {
    renderWithProviders(<RatingControl value={2} onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[2]).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the selected value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<RatingControl value={null} onChange={onChange} />);
    const goodButton = screen.getAllByRole("button")[2];
    expect(goodButton).toBeDefined();
    await user.click(goodButton as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("clears the rating when clicking the active option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<RatingControl value={1} onChange={onChange} />);
    const badButton = screen.getAllByRole("button")[0];
    expect(badButton).toBeDefined();
    await user.click(badButton as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
