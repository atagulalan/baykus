import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SeasonSummary } from "../../../api/types.ts";
import { mockSeason } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { formatSeasonCount, SeasonSection } from "./SeasonSection.tsx";

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
    const episodes = document.querySelector(".section-collapse");
    expect(episodes).toHaveAttribute("data-expanded", "true");

    await user.click(screen.getByRole("button", { name: /Season 1/i }));
    expect(episodes).toHaveAttribute("data-expanded", "false");
  });

  it("starts collapsed when not the current season", async () => {
    await renderWithRouter(<SeasonSection {...baseProps} nextUnwatched={{ s: 2, e: 1 }} />, {});
    const episodes = document.querySelector(".section-collapse");
    expect(episodes).toHaveAttribute("data-expanded", "false");
  });

  it("shows the watched/total ratio while in progress", async () => {
    await renderWithRouter(<SeasonSection {...baseProps} nextUnwatched={{ s: 1, e: 2 }} />, {});
    const watched = mockSeason.episodes.filter((e) => e.watchCount > 0).length;
    expect(screen.getByText(`${watched}/${mockSeason.episodes.length}`)).toBeInTheDocument();
  });

  it("shows a plain total when nothing is watched", async () => {
    const emptySeason: SeasonSummary = {
      ...mockSeason,
      episodes: mockSeason.episodes.map((ep) => ({
        ...ep,
        watchCount: 0,
        lastWatchedAt: null,
        myRating: null,
      })),
    };
    await renderWithRouter(
      <SeasonSection {...baseProps} season={emptySeason} nextUnwatched={{ s: 1, e: 1 }} />,
      {},
    );
    expect(screen.getByText(String(emptySeason.episodes.length))).toBeInTheDocument();
    expect(screen.queryByText(`0/${emptySeason.episodes.length}`)).not.toBeInTheDocument();
  });

  it("shows a plain total and complete ring when the season is finished", async () => {
    const doneSeason: SeasonSummary = {
      ...mockSeason,
      episodes: mockSeason.episodes.map((ep) => ({
        ...ep,
        watchCount: 1,
        lastWatchedAt: "2026-01-10T20:00:00.000Z",
      })),
    };
    await renderWithRouter(
      <SeasonSection {...baseProps} season={doneSeason} nextUnwatched={{ s: 2, e: 1 }} />,
      {},
    );
    expect(screen.getByText(String(doneSeason.episodes.length))).toBeInTheDocument();
    const ring = document.querySelector("[data-complete]");
    expect(ring).toHaveAttribute("data-value", "100");
  });

  it("formatSeasonCount collapses extremes to the total", () => {
    expect(formatSeasonCount(0, 10, false)).toBe("10");
    expect(formatSeasonCount(10, 10, true)).toBe("10");
    expect(formatSeasonCount(3, 10, false)).toBe("3/10");
  });

  // The actions menu sits beside the pill, outside the toggle button — opening it
  // must not also collapse the season.
  it("marks the season watched from the actions menu without toggling the accordion", async () => {
    const user = userEvent.setup();
    const onMarkSeasonWatched = vi.fn();
    await renderWithRouter(
      <SeasonSection
        {...baseProps}
        nextUnwatched={{ s: 1, e: 2 }}
        onMarkSeasonWatched={onMarkSeasonWatched}
      />,
      {},
    );
    const episodes = document.querySelector(".section-collapse");
    expect(episodes).toHaveAttribute("data-expanded", "true");

    await user.click(screen.getByRole("button", { name: /sezon menüsü/i }));
    await user.click(screen.getByRole("button", { name: /sezonu izledim/i }));
    expect(onMarkSeasonWatched).toHaveBeenCalledOnce();
    expect(episodes).toHaveAttribute("data-expanded", "true");
  });

  // Bulk unwatch is destructive and has no other entry point — it must confirm first.
  it("confirms before unwatching the season", async () => {
    const user = userEvent.setup();
    const onUnwatchSeason = vi.fn();
    await renderWithRouter(
      <SeasonSection
        {...baseProps}
        nextUnwatched={{ s: 1, e: 2 }}
        onUnwatchSeason={onUnwatchSeason}
      />,
      {},
    );

    await user.click(screen.getByRole("button", { name: /sezon menüsü/i }));
    await user.click(screen.getByRole("button", { name: /sezonu geri al/i }));
    expect(onUnwatchSeason).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /evet, sil/i }));
    expect(onUnwatchSeason).toHaveBeenCalledOnce();
  });
});
