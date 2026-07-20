import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { EpisodeRow } from "./EpisodeRow.tsx";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("EpisodeRow", () => {
  it("renders episode label and title", async () => {
    await renderWithRouter(
      <EpisodeRow s={1} e={1} episodeTitle="Pilot" airDate="2008-01-20" episodeType="standard" />,
      {},
    );
    expect(screen.getByText("Pilot")).toBeInTheDocument();
    expect(screen.getByText("S1E1")).toBeInTheDocument();
  });

  it("calls onToggleWatch when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onToggleWatch = vi.fn();
    await renderWithRouter(
      <EpisodeRow
        s={1}
        e={1}
        episodeTitle="Pilot"
        airDate="2008-01-20"
        episodeType="standard"
        watched={false}
        onToggleWatch={onToggleWatch}
      />,
      {},
    );
    await user.click(screen.getByRole("checkbox", { name: "İzledim" }));
    expect(onToggleWatch).toHaveBeenCalledOnce();
  });

  it("shows a 5-second trailing countdown before airStamp", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-19T00:00:00.000Z"));
    try {
      await renderWithRouter(
        <EpisodeRow
          s={9}
          e={9}
          episodeTitle="Episode 9"
          airDate="2026-07-19"
          airStamp="2026-07-19T00:00:05.000Z"
          episodeType="standard"
          watched={false}
        />,
        {},
      );
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("sn")).toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: "İzledim" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the details modal when the row is activated with Enter", async () => {
    const user = userEvent.setup();
    await renderWithRouter(
      <EpisodeRow s={1} e={1} episodeTitle="Pilot" airDate="2008-01-20" episodeType="standard" />,
      {},
    );

    const row = screen.getByRole("button", { name: "Pilot bölüm detaylarını aç" });
    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not open the details modal when the checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onToggleWatch = vi.fn();
    await renderWithRouter(
      <EpisodeRow
        s={1}
        e={1}
        episodeTitle="Pilot"
        airDate="2008-01-20"
        episodeType="standard"
        watched={false}
        onToggleWatch={onToggleWatch}
      />,
      {},
    );

    await user.click(screen.getByRole("checkbox", { name: "İzledim" }));
    expect(onToggleWatch).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the watched-options menu when a watched checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onToggleWatch = vi.fn();
    await renderWithRouter(
      <EpisodeRow
        s={1}
        e={1}
        episodeTitle="Pilot"
        airDate="2008-01-20"
        episodeType="standard"
        watched
        onToggleWatch={onToggleWatch}
        onWatchAgain={vi.fn()}
        onEditDate={vi.fn()}
      />,
      {},
    );

    await user.click(screen.getByRole("checkbox", { name: "İzledim" }));
    expect(onToggleWatch).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("İzlenmedi olarak işaretle")).toBeInTheDocument();
  });

  it("Shift+clicks a watched checkbox to unwatch without opening the menu", async () => {
    const user = userEvent.setup();
    const onToggleWatch = vi.fn();
    await renderWithRouter(
      <EpisodeRow
        s={1}
        e={1}
        episodeTitle="Pilot"
        airDate="2008-01-20"
        episodeType="standard"
        watched
        onToggleWatch={onToggleWatch}
        onWatchAgain={vi.fn()}
        onEditDate={vi.fn()}
      />,
      {},
    );

    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("checkbox", { name: "İzledim" }));
    await user.keyboard("{/Shift}");
    expect(onToggleWatch).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Shift+clicks an unwatched checkbox to mark only that episode when earlier are pending", async () => {
    const user = userEvent.setup();
    const onToggleWatch = vi.fn();
    const onBulkUpToHere = vi.fn();
    await renderWithRouter(
      <EpisodeRow
        s={1}
        e={2}
        episodeTitle="Episode 2"
        airDate="2008-01-27"
        episodeType="standard"
        watched={false}
        hasUnwatchedBefore
        onToggleWatch={onToggleWatch}
        onBulkUpToHere={onBulkUpToHere}
      />,
      {},
    );

    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("checkbox", { name: "İzledim" }));
    await user.keyboard("{/Shift}");
    expect(onToggleWatch).toHaveBeenCalledOnce();
    expect(onBulkUpToHere).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no axe violations for a season-list row", async () => {
    const { container } = await renderWithRouter(
      <EpisodeRow s={1} e={1} episodeTitle="Pilot" airDate="2008-01-20" episodeType="standard" />,
      {},
    );
    const row = container.querySelector(".episode-row-shell");
    expect(row).not.toBeNull();
    expect(await axe(row as HTMLElement)).toHaveNoViolations();
  });
});
