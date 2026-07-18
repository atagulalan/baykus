import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HBarList } from "./HBarList.tsx";

const items = [
  { key: "drama", label: "Drama", value: 420, displayValue: "420 ep" },
  { key: "crime", label: "Crime", value: 280, displayValue: "280 ep" },
  { key: "other", label: "Other", value: 95, displayValue: "95 ep", muted: true },
];

describe("HBarList", () => {
  it("renders labels for each row", () => {
    render(<HBarList items={items} />);
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.getByText("Crime")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("renders display values", () => {
    render(<HBarList items={items} />);
    expect(screen.getByText("420 ep")).toBeInTheDocument();
    expect(screen.getByText("280 ep")).toBeInTheDocument();
    expect(screen.getByText("95 ep")).toBeInTheDocument();
  });

  it("uses muted fill class for muted rows", () => {
    const { container } = render(<HBarList items={items} />);
    expect(container.querySelector(".bg-white\\/10")).toBeInTheDocument();
    expect(container.querySelector(".bg-yellow")).toBeInTheDocument();
  });
});
