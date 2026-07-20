import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
    expanded: true,
    onToggleExpanded: noop,
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

    function ToggleHarness() {
      const [expanded, setExpanded] = useState(true);
      return (
        <SeasonSection
          {...baseProps}
          expanded={expanded}
          onToggleExpanded={() => setExpanded((value) => !value)}
          nextUnwatched={{ s: 1, e: 2 }}
        />
      );
    }

    await renderWithRouter(<ToggleHarness />, {});
    expect(screen.getByText("Pilot")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Season 1/i }));
    await waitFor(() => {
      expect(screen.queryByText("Pilot")).not.toBeInTheDocument();
    });
    expect(document.querySelector('[data-slot="accordion-panel"]')).toHaveAttribute(
      "data-state",
      "closed",
    );
  });

  it("starts collapsed when not the current season", async () => {
    await renderWithRouter(
      <SeasonSection {...baseProps} expanded={false} nextUnwatched={{ s: 2, e: 1 }} />,
      {},
    );
    expect(screen.queryByText("Pilot")).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="accordion-panel"]')).toHaveAttribute(
      "data-state",
      "closed",
    );
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
      <SeasonSection
        {...baseProps}
        season={doneSeason}
        expanded={false}
        nextUnwatched={{ s: 2, e: 1 }}
      />,
      {},
    );
    expect(screen.getByText(String(doneSeason.episodes.length))).toBeInTheDocument();
    const ring = document.querySelector("[data-complete]");
    expect(ring).toHaveAttribute("data-value", "100");
  });

  // E180: caught up on aired while announced unaired remain — full green ring, no check, ratio count.
  it("shows a caught-up ring and watched/total when unaired episodes remain", async () => {
    const baseEpisode = mockSeason.episodes[0];
    if (!baseEpisode) throw new Error("expected mockSeason to have an episode");
    const caughtUpSeason: SeasonSummary = {
      ...mockSeason,
      episodes: [
        {
          ...baseEpisode,
          id: 1,
          e: 1,
          watchCount: 1,
          lastWatchedAt: "2026-01-10T20:00:00.000Z",
          airDate: "2026-01-01",
          airStamp: "2026-01-01T00:00:00.000Z",
        },
        {
          ...baseEpisode,
          id: 2,
          e: 2,
          watchCount: 1,
          lastWatchedAt: "2026-01-17T20:00:00.000Z",
          airDate: "2026-01-08",
          airStamp: "2026-01-08T00:00:00.000Z",
        },
        {
          ...baseEpisode,
          id: 3,
          e: 3,
          watchCount: 0,
          lastWatchedAt: null,
          myRating: null,
          airDate: "2099-01-01",
          airStamp: "2099-01-01T00:00:00.000Z",
        },
        {
          ...baseEpisode,
          id: 4,
          e: 4,
          watchCount: 0,
          lastWatchedAt: null,
          myRating: null,
          airDate: "2099-01-08",
          airStamp: "2099-01-08T00:00:00.000Z",
        },
      ],
    };
    await renderWithRouter(
      <SeasonSection
        {...baseProps}
        season={caughtUpSeason}
        expanded={false}
        nextUnwatched={null}
      />,
      {},
    );
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.queryByText("4")).not.toBeInTheDocument();
    const ring = document.querySelector("[data-caught-up]");
    expect(ring).toHaveAttribute("data-value", "100");
    expect(document.querySelector("[data-complete]")).toBeNull();
  });

  it("formatSeasonCount collapses extremes to the total", () => {
    expect(formatSeasonCount(0, 10, false)).toBe("10");
    expect(formatSeasonCount(10, 10, true)).toBe("10");
    expect(formatSeasonCount(3, 10, false)).toBe("3/10");
  });

  it("shows TBD count and empty panel for a confirmed season with zero episodes", async () => {
    const announcedEmpty: SeasonSummary = {
      ...mockSeason,
      number: 3,
      name: null,
      episodes: [],
    };
    await renderWithRouter(
      <SeasonSection {...baseProps} season={announcedEmpty} nextUnwatched={null} />,
      {},
    );

    expect(screen.getByText("Sezon 3")).toBeInTheDocument();
    expect(screen.getByText("TBD")).toBeInTheDocument();
    expect(screen.getByText("Bölümler henüz duyurulmadı")).toBeInTheDocument();
    expect(screen.getByText("Sezon onaylandı — bölüm listesi TBD.")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="season-empty"]')).toBeInTheDocument();
  });

  // The actions menu sits beside the pill, outside the toggle button — opening it
  // The actions menu opens from the progress ring, outside the label toggle —
  // opening it must not also collapse the season.
  it("marks the season watched from the progress ring menu without toggling the accordion", async () => {
    const user = userEvent.setup();
    const onMarkSeasonWatched = vi.fn();
    const partialSeason: SeasonSummary = {
      ...mockSeason,
      episodes: mockSeason.episodes.map((ep, index) =>
        index === 0
          ? ep
          : {
              ...ep,
              watchCount: 0,
              lastWatchedAt: null,
              myRating: null,
            },
      ),
    };
    await renderWithRouter(
      <SeasonSection
        {...baseProps}
        season={partialSeason}
        nextUnwatched={{ s: 1, e: 2 }}
        onMarkSeasonWatched={onMarkSeasonWatched}
      />,
      {},
    );
    const episodes = document.querySelector('[data-slot="accordion-panel"]');
    expect(episodes).toHaveAttribute("data-expanded", "true");

    await user.click(screen.getByRole("button", { name: /sezon menüsü/i }));
    await user.click(screen.getByRole("button", { name: /sezonu izledim/i }));
    expect(onMarkSeasonWatched).toHaveBeenCalledOnce();
    expect(episodes).toHaveAttribute("data-expanded", "true");
  });

  it("marks a zero-watch season directly from the actions trigger", async () => {
    const user = userEvent.setup();
    const onMarkSeasonWatched = vi.fn();
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
      <SeasonSection
        {...baseProps}
        season={emptySeason}
        nextUnwatched={{ s: 1, e: 1 }}
        onMarkSeasonWatched={onMarkSeasonWatched}
      />,
      {},
    );

    await user.click(screen.getByRole("button", { name: /sezonu izledim/i }));
    expect(onMarkSeasonWatched).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
