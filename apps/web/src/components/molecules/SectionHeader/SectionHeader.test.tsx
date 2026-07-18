import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Play } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { SectionHeader } from "./SectionHeader.tsx";

describe("SectionHeader", () => {
  it("renders label and count", () => {
    render(<SectionHeader label="Watching" count={12} />);
    expect(screen.getByRole("heading", { level: 2, name: /Watching/ })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("|")).toBeInTheDocument();
  });

  it("omits icon when not provided", () => {
    const { container } = render(<SectionHeader label="Finished" count={3} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders icon when provided", () => {
    const { container } = render(<SectionHeader icon={Play} label="Watching" count={5} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders trailing children", () => {
    render(
      <SectionHeader label="Watch later" count={2}>
        <button type="button">Sort</button>
      </SectionHeader>,
    );
    expect(screen.getByRole("button", { name: "Sort" })).toBeInTheDocument();
  });

  it("calls onClick when the label area is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SectionHeader label="Watching" count={12} onClick={onClick} expanded />);
    await user.click(screen.getByRole("button", { expanded: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when trailing controls are clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SectionHeader label="Watching" count={12} onClick={onClick} expanded>
        <button type="button">Sort</button>
      </SectionHeader>,
    );
    await user.click(screen.getByRole("button", { name: "Sort" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
