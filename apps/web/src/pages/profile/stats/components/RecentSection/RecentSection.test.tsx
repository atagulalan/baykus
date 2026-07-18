import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { RecentSection } from "./RecentSection.tsx";

describe("RecentSection", () => {
  it("renders title and rolling window tiles", () => {
    renderWithProviders(<RecentSection stats={{ recent: mockStats.recent }} />);
    expect(screen.getByRole("heading", { name: "Son Dönem" })).toBeInTheDocument();
    expect(screen.getByText("Son 7 Gün")).toBeInTheDocument();
    expect(screen.getByText("Son 30 Gün")).toBeInTheDocument();
    expect(screen.getByText("Bu Ay")).toBeInTheDocument();
  });

  it("returns null when all recent windows have zero episodes", () => {
    const { container } = renderWithProviders(
      <RecentSection stats={{ recent: mockStatsWithEmptySections.recent }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
