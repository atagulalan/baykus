import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { BingesSection } from "./BingesSection.tsx";

describe("BingesSection", () => {
  it("renders title and binge entries", () => {
    renderWithProviders(<BingesSection stats={{ binges: mockStats.binges }} />);
    expect(screen.getByRole("heading", { name: "En Hızlı Binge'ler" })).toBeInTheDocument();
    expect(screen.getByText(/Breaking Bad/)).toBeInTheDocument();
    expect(screen.getByText(/The Wire/)).toBeInTheDocument();
  });

  it("returns null when binges is empty", () => {
    const { container } = renderWithProviders(
      <BingesSection stats={{ binges: mockStatsWithEmptySections.binges }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
