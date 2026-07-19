import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./StatTile.tsx";

describe("StatTile", () => {
  it("renders label and value", () => {
    render(<StatTile label="Episodes" value="842" />);
    expect(screen.getByText("Episodes")).toBeInTheDocument();
    expect(screen.getByText("842")).toBeInTheDocument();
  });

  it("renders optional sub text", () => {
    render(<StatTile label="Last 7 days" value="12h" sub="48 episodes" />);
    expect(screen.getByText("48 episodes")).toBeInTheDocument();
  });

  it("omits sub paragraph when not provided", () => {
    const { container } = render(<StatTile label="Series" value="47" />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("applies compact size classes for the profile hub", () => {
    const { container } = render(<StatTile size="compact" label="Time" value="7m" />);
    expect(container.firstElementChild?.className).toContain("p-4");
    expect(container.firstElementChild?.className).toContain("rounded-md");
    expect(container.firstElementChild?.className).toContain("bg-white/10");
    expect(container.firstElementChild?.className).not.toContain("border");
  });
});
