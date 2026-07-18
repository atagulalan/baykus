import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { MostWatchedSection } from "./MostWatchedSection.tsx";

describe("MostWatchedSection", () => {
  it("renders title and top series by watch time", () => {
    renderWithProviders(
      <MostWatchedSection stats={{ mostWatchedByTime: mockStats.mostWatchedByTime }} />,
    );
    expect(screen.getByRole("heading", { name: "En Çok İzlediklerim" })).toBeInTheDocument();
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText("The Wire")).toBeInTheDocument();
  });

  it("returns null when mostWatchedByTime is empty", () => {
    const { container } = renderWithProviders(
      <MostWatchedSection
        stats={{ mostWatchedByTime: mockStatsWithEmptySections.mostWatchedByTime }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
