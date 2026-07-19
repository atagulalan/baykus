import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { CategoryStatusSection } from "./CategoryStatusSection.tsx";

describe("CategoryStatusSection", () => {
  it("renders title when categories have items", () => {
    renderWithProviders(<CategoryStatusSection stats={{ itemCount: mockStats.itemCount }} />);
    expect(screen.getByRole("heading", { name: "İzleme Durumu" })).toBeInTheDocument();
  });

  it("returns null when all chart categories are zero", () => {
    const emptyItemCount = {
      ...mockStats.itemCount,
      watching: 0,
      not_watched_recently: 0,
      not_started: 0,
      watch_later: 0,
      up_to_date: 0,
      finished: 0,
      stopped: 0,
    };
    const { container } = renderWithProviders(
      <CategoryStatusSection stats={{ itemCount: emptyItemCount }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders legend entries for all segments including zero-value categories", () => {
    renderWithProviders(<CategoryStatusSection stats={{ itemCount: mockStats.itemCount }} />);
    expect(screen.getByText(/İzleniyor \(\d+\)/)).toBeInTheDocument();
    expect(screen.getByText(/Bitirildi \(\d+\)/)).toBeInTheDocument();
  });

  it("skips zero-value segments in the bar track", () => {
    const itemCount = {
      ...mockStats.itemCount,
      watching: 5,
      finished: 10,
      stopped: 0,
    };
    const { container } = renderWithProviders(<CategoryStatusSection stats={{ itemCount }} />);
    const barSegments = container.querySelectorAll(".flex.h-3 [title]");
    expect(barSegments.length).toBeGreaterThan(0);
    for (const segment of barSegments) {
      expect(segment.getAttribute("title")).not.toMatch(/: 0$/);
    }
  });
});
