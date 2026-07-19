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
});
