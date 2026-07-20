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

  it("prefers leading over icon", () => {
    render(
      <SectionHeader
        icon={Play}
        leading={<span data-testid="leading">ring</span>}
        label="Season 1"
        count={2}
      />,
    );
    expect(screen.getByTestId("leading")).toBeInTheDocument();
  });

  it("calls onClick when the label area is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SectionHeader label="Watching" count={12} onClick={onClick} expanded />);
    await user.click(screen.getByRole("button", { expanded: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders a ratio count", () => {
    render(<SectionHeader label="Season 1" count="3/10" />);
    expect(screen.getByText("3/10")).toBeInTheDocument();
  });

  it("renders the action beside the pill, outside the toggle", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onAction = vi.fn();
    render(
      <SectionHeader
        label="Season 1"
        count="3/10"
        onClick={onClick}
        expanded
        action={
          <button type="button" onClick={onAction}>
            menu
          </button>
        }
      />,
    );

    const action = screen.getByRole("button", { name: "menu" });
    expect(screen.getByRole("heading", { level: 2 })).not.toContainElement(action);

    await user.click(action);
    expect(onAction).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps leading outside the expand toggle so it can host its own control", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onLeading = vi.fn();
    render(
      <SectionHeader
        label="Season 1"
        count="3/10"
        onClick={onClick}
        expanded
        leading={
          <button type="button" onClick={onLeading}>
            ring
          </button>
        }
      />,
    );

    const leading = screen.getByRole("button", { name: "ring" });
    const toggle = screen.getByRole("button", { name: /Season 1/i });
    expect(toggle).not.toContainElement(leading);

    await user.click(leading);
    expect(onLeading).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });
});
