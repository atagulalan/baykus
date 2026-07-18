import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { StepperInput } from "./StepperInput.tsx";

describe("StepperInput", () => {
  it("increments value on plus button press", () => {
    const onChange = vi.fn();
    renderWithProviders(<StepperInput value={5} onChange={onChange} min={0} max={10} />);
    const increase = screen.getByRole("button", { name: "Arttır" });
    fireEvent.mouseDown(increase);
    fireEvent.mouseUp(increase);
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("decrements value on minus button press", () => {
    const onChange = vi.fn();
    renderWithProviders(<StepperInput value={5} onChange={onChange} min={0} max={10} />);
    const decrease = screen.getByRole("button", { name: "Azalt" });
    fireEvent.mouseDown(decrease);
    fireEvent.mouseUp(decrease);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("disables decrease at minimum", () => {
    renderWithProviders(<StepperInput value={0} onChange={() => {}} min={0} max={10} />);
    expect(screen.getByRole("button", { name: "Azalt" })).toBeDisabled();
  });

  it("clamps invalid blur input and resets display", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<StepperInput value={5} onChange={onChange} min={0} max={10} />);
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "abc");
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("5");
  });

  it("clamps out-of-range blur input to bounds", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<StepperInput value={5} onChange={onChange} min={0} max={10} />);
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "99");
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(10);
    expect(input).toHaveValue("10");
  });
});
