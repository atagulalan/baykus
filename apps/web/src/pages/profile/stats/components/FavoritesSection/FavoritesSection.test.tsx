import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders, renderWithRouter } from "../../../../../test/renderWithProviders.tsx";
import { FavoritesSection } from "./FavoritesSection.tsx";

describe("FavoritesSection", () => {
  it("renders title and favorite series links", async () => {
    renderWithRouter(<FavoritesSection stats={{ favoriteProgress: mockStats.favoriteProgress }} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Favoriler" })).toBeInTheDocument();
    });
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText("The Wire")).toBeInTheDocument();
  });

  it("returns null when favoriteProgress is empty", () => {
    const { container } = renderWithProviders(
      <FavoritesSection
        stats={{ favoriteProgress: mockStatsWithEmptySections.favoriteProgress }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
