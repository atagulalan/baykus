import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircularProgress } from "./CircularProgress.tsx";

describe("CircularProgress", () => {
  it("exposes the fill percent for tests / styling hooks", () => {
    const { container } = render(<CircularProgress value={40} />);
    const ring = container.firstElementChild;
    expect(ring).toHaveAttribute("data-value", "40");
    expect(ring).toHaveAttribute("aria-hidden");
  });

  it("marks complete with a check icon and full value", () => {
    const { container } = render(<CircularProgress value={100} complete />);
    const ring = container.firstElementChild;
    expect(ring).toHaveAttribute("data-complete");
    expect(ring).toHaveAttribute("data-value", "100");
    // Track + fill SVG, plus lucide Check
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });

  it("marks caught-up as a full green ring without a check", () => {
    const { container } = render(<CircularProgress value={100} caughtUp />);
    const ring = container.firstElementChild;
    expect(ring).toHaveAttribute("data-caught-up");
    expect(ring).not.toHaveAttribute("data-complete");
    expect(ring).toHaveAttribute("data-value", "100");
    // Track SVG only — no Check icon
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    const fill = container.querySelectorAll("circle")[1];
    expect(fill).toHaveClass("stroke-green-500");
  });

  // E181: near-complete in-progress rings stay visually open so the seam stays readable.
  it("caps in-progress fill at 90 so the ring seam stays visible", () => {
    const { container } = render(<CircularProgress value={96} />);
    expect(container.firstElementChild).toHaveAttribute("data-value", "90");
  });

  it("still draws a full ring when complete or caught-up", () => {
    const { rerender, container } = render(<CircularProgress value={96} complete />);
    expect(container.firstElementChild).toHaveAttribute("data-value", "100");
    rerender(<CircularProgress value={96} caughtUp />);
    expect(container.firstElementChild).toHaveAttribute("data-value", "100");
  });
});
