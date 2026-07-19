import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { Heatmap } from "./Heatmap.tsx";

describe("Heatmap", () => {
  it("renders year labels for each year", () => {
    renderWithProviders(
      <Heatmap
        years={[2025, 2026]}
        days={mockStats.activityByDay}
        tooltipFor={(date, count) => `${date}: ${count}`}
        ariaLabel="Activity heatmap"
      />,
    );
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("renders tooltips for days with activity", () => {
    renderWithProviders(
      <Heatmap
        years={[2026]}
        days={[{ date: "2026-07-07", count: 6 }]}
        tooltipFor={(date, count) => `${date}: ${count} bölüm`}
        ariaLabel="Activity heatmap"
      />,
    );
    expect(screen.getByTitle("2026-07-07: 6 bölüm")).toBeInTheDocument();
  });

  it("renders year grid when days is empty", () => {
    renderWithProviders(
      <Heatmap
        years={[2026]}
        days={[]}
        tooltipFor={(date, count) => `${date}: ${count}`}
        ariaLabel="Activity heatmap"
      />,
    );
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByTitle("2026-01-01: 0")).toBeInTheDocument();
  });
});
