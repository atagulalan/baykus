import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { NetworkDistributionSection } from "./NetworkDistributionSection.tsx";

describe("NetworkDistributionSection", () => {
  it("renders title, network count, and top networks", () => {
    renderWithProviders(
      <NetworkDistributionSection stats={{ networkDistribution: mockStats.networkDistribution }} />,
    );
    expect(screen.getByRole("heading", { name: "Network Dağılımı" })).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("HBO")).toBeInTheDocument();
    expect(screen.getByText("AMC")).toBeInTheDocument();
  });

  it("returns null when networkCount is zero", () => {
    const { container } = renderWithProviders(
      <NetworkDistributionSection
        stats={{ networkDistribution: mockStatsWithEmptySections.networkDistribution }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
