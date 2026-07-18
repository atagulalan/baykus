import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats } from "../../../../../test/mocks.ts";
import { renderWithProviders, renderWithRouter } from "../../../../../test/renderWithProviders.tsx";
import { RewatchSummarySection } from "./RewatchSummarySection.tsx";

describe("RewatchSummarySection", () => {
  it("renders title, summary tiles, and most rewatched episode", async () => {
    renderWithRouter(
      <RewatchSummarySection
        stats={{
          rewatchSummary: mockStats.rewatchSummary,
          mostRewatched: mockStats.mostRewatched,
        }}
      />,
      {},
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Tekrar İzlemeler" })).toBeInTheDocument();
    });
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getAllByText("Breaking Bad").length).toBeGreaterThan(0);
    expect(screen.getByText("3x")).toBeInTheDocument();
  });

  it("returns null when rewatch summary and mostRewatched are empty", () => {
    const { container } = renderWithProviders(
      <RewatchSummarySection
        stats={{
          rewatchSummary: { totalRewatches: 0, rewatchedEpisodes: 0, bySeries: [] },
          mostRewatched: [],
        }}
      />,
      {},
    );
    expect(container.firstChild).toBeNull();
  });
});
