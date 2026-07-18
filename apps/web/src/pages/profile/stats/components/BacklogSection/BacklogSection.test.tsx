import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { BacklogSection } from "./BacklogSection.tsx";

describe("BacklogSection", () => {
  it("renders title and top backlog series", () => {
    renderWithProviders(<BacklogSection stats={{ backlog: mockStats.backlog }} />);
    expect(screen.getByRole("heading", { name: "Kalan Bölümler" })).toBeInTheDocument();
    expect(screen.getByText("The Bear")).toBeInTheDocument();
    expect(screen.getByText("156")).toBeInTheDocument();
  });

  it("returns null when backlog episodes is zero", () => {
    const { container } = renderWithProviders(
      <BacklogSection stats={{ backlog: mockStatsWithEmptySections.backlog }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
