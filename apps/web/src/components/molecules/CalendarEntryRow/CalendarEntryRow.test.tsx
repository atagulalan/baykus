import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockCalendarEntry } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { CalendarEntryRow } from "./CalendarEntryRow.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("CalendarEntryRow", () => {
  it("renders episode content via EpisodeRow", async () => {
    await renderWithRouter(<CalendarEntryRow entry={mockCalendarEntry} />, {
      seriesParam: "i1",
    });
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText("S3E5")).toBeInTheDocument();
    expect(screen.getByText("Más")).toBeInTheDocument();
  });

  it("passes watched state through to EpisodeRow", async () => {
    await renderWithRouter(
      <CalendarEntryRow entry={mockCalendarEntry} watched onToggleWatched={() => {}} />,
      {},
    );
    expect(screen.getByRole("checkbox", { name: "İzledim" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
