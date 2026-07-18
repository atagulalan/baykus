import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { ActivityHeatmapSection } from "./ActivityHeatmapSection.tsx";

describe("ActivityHeatmapSection", () => {
  it("renders title and year labels with activity data", () => {
    renderWithProviders(
      <ActivityHeatmapSection
        stats={{
          activityByDay: mockStats.activityByDay,
          timeByYear: mockStats.timeByYear,
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Yıllık Aktivite" })).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("returns null when timeByYear is empty", () => {
    const { container } = renderWithProviders(
      <ActivityHeatmapSection
        stats={{
          activityByDay: mockStats.activityByDay,
          timeByYear: mockStatsWithEmptySections.timeByYear,
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows empty message when activityByDay is empty", () => {
    renderWithProviders(
      <ActivityHeatmapSection
        stats={{
          activityByDay: [],
          timeByYear: mockStats.timeByYear,
        }}
      />,
    );
    expect(screen.getByText("Henüz izleme kaydı yok")).toBeInTheDocument();
  });
});
