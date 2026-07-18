import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders, renderWithRouter } from "../../../../../test/renderWithProviders.tsx";
import { ProductionSection } from "./ProductionSection.tsx";

describe("ProductionSection", () => {
  it("renders title, counts, and ongoing series links", async () => {
    renderWithRouter(<ProductionSection stats={{ production: mockStats.production }} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Prodüksiyon Durumu" })).toBeInTheDocument();
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByText("Severance")).toBeInTheDocument();
  });

  it("returns null when ongoing and ended are both zero", () => {
    const { container } = renderWithProviders(
      <ProductionSection stats={{ production: mockStatsWithEmptySections.production }} />,
      {},
    );
    expect(container.firstChild).toBeNull();
  });
});
