import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { EpisodeRow } from "./EpisodeRow.tsx";

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
});
