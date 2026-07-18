import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { StreaksSection } from "./StreaksSection.tsx";

describe("StreaksSection", () => {
  it("renders title and streak stat tiles", () => {
    renderWithProviders(<StreaksSection stats={{ streaks: mockStats.streaks }} />);
    expect(screen.getByRole("heading", { name: "Haftalık Seri" })).toBeInTheDocument();
    expect(screen.getByText("12 hafta")).toBeInTheDocument();
    expect(screen.getByText("3 hafta")).toBeInTheDocument();
    expect(screen.getAllByText("Breaking Bad").length).toBeGreaterThan(0);
  });

  it("returns null when longestWeeks is zero", () => {
    const { container } = renderWithProviders(
      <StreaksSection stats={{ streaks: mockStatsWithEmptySections.streaks }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
