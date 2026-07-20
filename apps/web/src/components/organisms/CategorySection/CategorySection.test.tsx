import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockSeriesSummary } from "../../../test/mocks.ts";
import { renderWithProviders, renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { CategorySection } from "./CategorySection.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("CategorySection", () => {
  it("returns null when items is empty", async () => {
    const { container } = renderWithProviders(
      <CategorySection category="watching" items={[]} sort="lastWatched" />,
      { withRouter: false },
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders series cards for non-empty items", async () => {
    await renderWithRouter(
      <CategorySection category="watching" items={[mockSeriesSummary]} sort="lastWatched" />,
      {},
    );
    expect(screen.getAllByText("Breaking Bad").length).toBeGreaterThan(0);
    expect(screen.getByText(/42\s*\/\s*62/)).toBeInTheDocument();
  });

  it("hides cards when collapsed", async () => {
    const { container } = await renderWithRouter(
      <CategorySection
        category="watching"
        items={[mockSeriesSummary]}
        sort="lastWatched"
        collapsed
        onToggleCollapse={() => {}}
      />,
      {},
    );
    expect(container.querySelector('[data-slot="accordion-panel"]')).toHaveAttribute(
      "data-expanded",
      "false",
    );
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
  });
});
