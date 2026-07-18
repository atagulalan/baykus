import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockEpisode, mockSeriesSummary } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { NextUpCard } from "./NextUpCard.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("NextUpCard", () => {
  const noop = vi.fn();

  it("renders next up heading and episode row", async () => {
    await renderWithRouter(
      <NextUpCard
        episode={mockEpisode}
        nextEpisode={mockSeriesSummary.nextUnwatched!}
        promptEpisodeId={null}
        onToggleWatch={noop}
        onWatchAgain={noop}
        onEditDate={noop}
        onBulkUpToHere={noop}
        onRateEpisode={noop}
        onDismissPrompt={noop}
      />,
      {},
    );
    expect(screen.getByRole("heading", { name: "Sıradaki:" })).toBeInTheDocument();
    expect(screen.getByText("Más")).toBeInTheDocument();
    expect(screen.getByText("S3E5")).toBeInTheDocument();
  });
});
