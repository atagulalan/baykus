import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockSeason } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { SeasonSection } from "./SeasonSection.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("SeasonSection", () => {
  const noop = vi.fn();

  const baseProps = {
    season: mockSeason,
    onToggleWatch: noop,
    onWatchAgain: noop,
    onEditDate: noop,
    onBulkUpToHere: noop,
    onMarkSeasonWatched: noop,
    onUnwatchSeason: noop,
    promptEpisodeId: null,
    onRateEpisode: noop,
    onDismissPrompt: noop,
  };

  it("renders season label and episode titles", async () => {
    await renderWithRouter(<SeasonSection {...baseProps} nextUnwatched={{ s: 1, e: 2 }} />, {});
    expect(screen.getByText("Season 1")).toBeInTheDocument();
    expect(screen.getByText("Pilot")).toBeInTheDocument();
    expect(screen.getByText("Cat's in the Bag...")).toBeInTheDocument();
  });

  it("starts expanded for the current season and collapses on toggle", async () => {
    const user = userEvent.setup();
    await renderWithRouter(<SeasonSection {...baseProps} nextUnwatched={{ s: 1, e: 2 }} />, {});
    const episodes = document.querySelector(".season-episodes");
    expect(episodes).toHaveAttribute("data-expanded", "true");

    await user.click(screen.getByRole("button", { name: /Season 1/i }));
    expect(episodes).toHaveAttribute("data-expanded", "false");
  });

  it("starts collapsed when not the current season", async () => {
    await renderWithRouter(<SeasonSection {...baseProps} nextUnwatched={{ s: 2, e: 1 }} />, {});
    const episodes = document.querySelector(".season-episodes");
    expect(episodes).toHaveAttribute("data-expanded", "false");
  });
});
