import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { PaceSection } from "./PaceSection.tsx";

describe("PaceSection (render)", () => {
  it("renders title and pace stat tiles", () => {
    renderWithProviders(<PaceSection stats={{ pace: mockStats.pace }} />);
    expect(screen.getByRole("heading", { name: "Yakalama Hızı" })).toBeInTheDocument();
    expect(screen.getByText("Haftalık Hız")).toBeInTheDocument();
    expect(screen.getByText("~4 bölüm")).toBeInTheDocument();
    expect(screen.getByText("~19 haftada bitirirsin")).toBeInTheDocument();
  });

  it("returns null when pace is null", () => {
    const { container } = renderWithProviders(
      <PaceSection stats={{ pace: mockStatsWithEmptySections.pace }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows caught-up copy when projectedWeeks is zero", () => {
    renderWithProviders(
      <PaceSection stats={{ pace: { episodesPerWeek: 4.2, projectedWeeks: 0 } }} />,
    );
    expect(screen.getByText("Bitirdin")).toBeInTheDocument();
    expect(screen.queryByText(/yani tahmini/i)).not.toBeInTheDocument();
  });
});
