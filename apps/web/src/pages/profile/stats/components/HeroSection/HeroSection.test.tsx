import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { HeroSection } from "./HeroSection.tsx";

describe("HeroSection", () => {
  it("renders stat tile labels and values", () => {
    renderWithProviders(<HeroSection stats={mockStats} />);
    expect(screen.getByText("Takip Edilen")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("İzlenen Bölüm")).toBeInTheDocument();
    expect(screen.getByText("842")).toBeInTheDocument();
    expect(screen.getByText("Favori")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows empty message when episodesWatched is zero", () => {
    renderWithProviders(<HeroSection stats={{ ...mockStats, episodesWatched: 0 }} />);
    expect(screen.getByText("Henüz izleme kaydı yok")).toBeInTheDocument();
  });

  it("does not show empty message when episodes have been watched", () => {
    renderWithProviders(<HeroSection stats={mockStats} />);
    expect(screen.queryByText("Henüz izleme kaydı yok")).not.toBeInTheDocument();
  });
});
