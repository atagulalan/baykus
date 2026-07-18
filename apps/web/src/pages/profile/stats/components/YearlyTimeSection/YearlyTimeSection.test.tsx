import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockStats, mockStatsWithEmptySections } from "../../../../../test/mocks.ts";
import { renderWithProviders } from "../../../../../test/renderWithProviders.tsx";
import { YearlyTimeSection } from "./YearlyTimeSection.tsx";

describe("YearlyTimeSection", () => {
  it("renders title and default selected year", () => {
    renderWithProviders(<YearlyTimeSection stats={{ timeByYear: mockStats.timeByYear }} />);
    expect(
      screen.getByRole("heading", { name: "Haftalık / Aylık İzleme Süresi" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026" })).toHaveClass("text-yellow");
  });

  it("switches selected year when a different year is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<YearlyTimeSection stats={{ timeByYear: mockStats.timeByYear }} />);

    await user.click(screen.getByRole("button", { name: "2025" }));

    expect(screen.getByRole("button", { name: "2025" })).toHaveClass("text-yellow");
    expect(screen.getByRole("button", { name: "2026" })).not.toHaveClass("text-yellow");
  });

  it("returns null when timeByYear is empty", () => {
    const { container } = renderWithProviders(
      <YearlyTimeSection stats={{ timeByYear: mockStatsWithEmptySections.timeByYear }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
