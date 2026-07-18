import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockCalendarDays } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { MonthGrid } from "./MonthGrid.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("MonthGrid", () => {
  it("renders weekday headers and day cells for the month", async () => {
    const { container } = await renderWithRouter(
      <MonthGrid year={2026} month={7} days={mockCalendarDays} />,
      { seriesParam: "i1" },
    );
    const desktopGrid = container.querySelector('[class*="sm:block"]');
    expect(desktopGrid).toBeTruthy();

    expect(within(desktopGrid as HTMLElement).getByText("Pzt")).toBeInTheDocument();
    expect(within(desktopGrid as HTMLElement).getByText("Sal")).toBeInTheDocument();
    expect(within(desktopGrid as HTMLElement).getByText("15")).toBeInTheDocument();
    expect(screen.getAllByText("Breaking Bad").length).toBeGreaterThan(0);
  });
});
