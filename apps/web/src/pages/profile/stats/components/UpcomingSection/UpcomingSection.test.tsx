import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { UpcomingSection } from "./UpcomingSection.tsx";

describe("UpcomingSection", () => {
  it("renders title and upcoming month tiles", () => {
    renderWithProviders(<UpcomingSection stats={{ upcoming: mockStats.upcoming }} />);
    expect(screen.getByRole("heading", { name: "Yaklaşan Bölümler" })).toBeInTheDocument();
    expect(screen.getByText("Bu Ay")).toBeInTheDocument();
    expect(screen.getByText("Gelecek Ay")).toBeInTheDocument();
  });

  it("returns null when upcoming months are empty", () => {
    const { container } = renderWithProviders(
      <UpcomingSection stats={{ upcoming: mockStatsWithEmptySections.upcoming }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
