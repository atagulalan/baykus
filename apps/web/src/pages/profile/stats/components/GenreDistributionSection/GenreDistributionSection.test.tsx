import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { GenreDistributionSection } from "./GenreDistributionSection.tsx";

describe("GenreDistributionSection", () => {
  it("renders title and top genres", () => {
    renderWithProviders(
      <GenreDistributionSection stats={{ genreDistribution: mockStats.genreDistribution }} />,
    );
    expect(screen.getByRole("heading", { name: "Tür Dağılımı" })).toBeInTheDocument();
    expect(screen.getByText("Dram")).toBeInTheDocument();
    expect(screen.getByText("Suç")).toBeInTheDocument();
  });

  it("returns null when distribution is empty", () => {
    const { container } = renderWithProviders(
      <GenreDistributionSection
        stats={{ genreDistribution: mockStatsWithEmptySections.genreDistribution }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
