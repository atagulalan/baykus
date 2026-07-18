import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionPill } from "./SectionPill.tsx";

describe("SectionPill", () => {
  it("renders children in an h2 with pill chrome", () => {
    render(<SectionPill>Today</SectionPill>);
    const heading = screen.getByRole("heading", { level: 2, name: "Today" });
    expect(heading).toHaveClass("rounded-full");
    expect(heading).toHaveClass("min-h-7");
  });

  it("applies split padding when trailing controls are present", () => {
    render(
      <SectionPill padding="split">
        <span>Watching</span>
      </SectionPill>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("py-0");
  });

  it("calls onClick when the label button is pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SectionPill onClick={onClick}>Earlier</SectionPill>);

    await user.click(screen.getByRole("button", { name: "Earlier" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
