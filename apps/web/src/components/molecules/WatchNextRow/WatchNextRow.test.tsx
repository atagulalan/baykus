import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockSeriesSummary } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { WatchNextRow } from "./WatchNextRow.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("WatchNextRow (render)", () => {
  it("renders series title and next episode", async () => {
    await renderWithRouter(<WatchNextRow series={mockSeriesSummary} onQuickMark={vi.fn()} />, {
      seriesParam: "i1",
    });
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText("Más")).toBeInTheDocument();
  });

  it("renders a no-next row when series has no nextUnwatched", async () => {
    await renderWithRouter(
      <WatchNextRow
        series={{ ...mockSeriesSummary, nextUnwatched: null, category: "finished" }}
        onQuickMark={vi.fn()}
      />,
      { seriesParam: "i1" },
    );
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText(/Güncel|Up to date/)).toBeInTheDocument();
  });

  it("renders a caught-up row for up_to_date without nextUnwatched", async () => {
    await renderWithRouter(
      <WatchNextRow
        series={{
          ...mockSeriesSummary,
          category: "up_to_date",
          nextUnwatched: null,
          nextAirDate: "2026-08-15",
        }}
        onQuickMark={vi.fn()}
      />,
      { seriesParam: "i1" },
    );
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText(/2026|August|Ağustos|15/)).toBeInTheDocument();
  });
});
