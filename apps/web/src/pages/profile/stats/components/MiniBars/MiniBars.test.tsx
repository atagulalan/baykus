import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MiniBars } from "./MiniBars.tsx";

const items = [
  { key: "0", label: "0h", value: 2, tooltip: "Midnight: 2" },
  { key: "1", label: "3h", value: 5, tooltip: "3am: 5" },
  { key: "2", label: "6h", value: 0, tooltip: "6am: 0" },
  { key: "3", label: "9h", value: 8, tooltip: "9am: 8" },
];

describe("MiniBars", () => {
  it("renders a bar cell for each item", () => {
    const { container } = render(<MiniBars items={items} />);
    expect(container.querySelectorAll(".flex.h-\\[120px\\] .bg-yellow")).toHaveLength(4);
  });

  it("renders labels according to labelEvery", () => {
    render(<MiniBars items={items} labelEvery={2} />);
    expect(screen.getByText("0h")).toBeInTheDocument();
    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.queryByText("3h")).not.toBeInTheDocument();
  });

  it("sets title tooltips on bar cells", () => {
    const { container } = render(<MiniBars items={items} />);
    expect(container.querySelector("[title='Midnight: 2']")).toBeInTheDocument();
    expect(container.querySelector("[title='9am: 8']")).toBeInTheDocument();
  });
});
