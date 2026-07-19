import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsSectionHeading } from "./StatsSectionHeading.tsx";

describe("StatsSectionHeading", () => {
  it("renders its children as a level-2 heading", () => {
    render(<StatsSectionHeading>Most watched</StatsSectionHeading>);
    const heading = screen.getByRole("heading", { level: 2, name: "Most watched" });
    expect(heading).toBeInTheDocument();
  });
});
