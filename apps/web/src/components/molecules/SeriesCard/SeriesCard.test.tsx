import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockSeriesSummary } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { SeriesCard } from "./SeriesCard.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("SeriesCard", () => {
  it("renders series title and progress", async () => {
    await renderWithRouter(<SeriesCard series={mockSeriesSummary} />);
    expect(screen.getAllByText("Breaking Bad").length).toBeGreaterThan(0);
    expect(screen.getByText(/42\s*\/\s*62/)).toBeInTheDocument();
    expect(screen.getByText("2008")).toBeInTheDocument();
  });
});
