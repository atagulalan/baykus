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

  it("applies splitLabel padding for collapsible headers", () => {
    render(
      <SectionPill padding="splitLabel">
        <span>Watching</span>
      </SectionPill>,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("py-0");
    expect(heading).toHaveClass("px-2.5");
  });

  it("calls onClick when the label button is pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SectionPill onClick={onClick}>Earlier</SectionPill>);

    await user.click(screen.getByRole("button", { name: "Earlier" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("insets the splitLabel button horizontally so hover fills the pill", () => {
    render(
      <SectionPill padding="splitLabel" onClick={() => {}}>
        Earlier
      </SectionPill>,
    );
    const button = screen.getByRole("button", { name: "Earlier" });
    const heading = screen.getByRole("heading", { level: 2 });
    expect(button).toHaveClass("-mx-2.5");
    expect(button).toHaveClass("px-2.5");
    expect(heading).toHaveClass("px-2.5");
  });
});
