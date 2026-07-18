import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockSeriesSummary } from "../../../test/mocks.ts";
import { renderWithRouter } from "../../../test/renderWithProviders.tsx";
import { CategoryListSection } from "./CategoryListSection.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("CategoryListSection", () => {
  const baseProps = {
    category: "watch_later" as const,
    sort: "lastWatched" as const,
    isMarking: () => false,
    onQuickMark: vi.fn(),
  };

  it("renders watch-next rows when items have nextUnwatched", async () => {
    await renderWithRouter(<CategoryListSection {...baseProps} items={[mockSeriesSummary]} />, {});
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText("Más")).toBeInTheDocument();
  });

  it("shows empty section message when no rows qualify", async () => {
    await renderWithRouter(
      <CategoryListSection
        {...baseProps}
        items={[{ ...mockSeriesSummary, nextUnwatched: null }]}
      />,
      {},
    );
    expect(screen.getByText("Bu kategoride gösterilecek dizi yok")).toBeInTheDocument();
  });

  it("does not show section remove control in the header", async () => {
    await renderWithRouter(
      <CategoryListSection {...baseProps} items={[mockSeriesSummary]} />,
      {},
    );
    expect(screen.queryByRole("button", { name: "Kategoriyi kaldır" })).not.toBeInTheDocument();
  });
});
