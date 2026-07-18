import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockCalendarDays } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { ScheduleGrid } from "./ScheduleGrid.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("ScheduleGrid", () => {
  it("renders schedule grid with calendar entries", async () => {
    await renderWithRouter(<ScheduleGrid days={mockCalendarDays} />);
    expect(screen.getAllByText("Breaking Bad").length).toBeGreaterThan(0);
    expect(screen.getByText("Pazartesi")).toBeInTheDocument();
  });

  it("shows localized boundary labels when pagination ends", async () => {
    await renderWithRouter(
      <ScheduleGrid days={mockCalendarDays} hasNextPageLeft={false} hasNextPageRight={false} />,
    );
    expect(screen.getAllByText("Devamı yok")).toHaveLength(2);
  });
});
