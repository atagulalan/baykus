import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockSeriesSummary } from "../../../test/mocks.ts";
import { renderWithProviders, renderWithRouter } from "../../../test/renderWithProviders.tsx";
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

  it("returns null when series has no nextUnwatched", async () => {
    const { container } = renderWithProviders(
      <WatchNextRow series={{ ...mockSeriesSummary, nextUnwatched: null }} onQuickMark={vi.fn()} />,
      { withRouter: false },
    );
    expect(container.firstChild).toBeNull();
  });
});
