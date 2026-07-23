import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { SeriesActionsMenu } from "./SeriesActionsMenu.tsx";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("SeriesActionsMenu", () => {
  const baseProps = {
    favorite: false,
    manualList: null,
    category: "watching" as const,
    pushMuted: false,
    onToggleFavorite: vi.fn(),
    onChangeManualList: vi.fn(),
    onToggleMute: vi.fn(),
    onRemove: vi.fn(),
  };

  it("opens the menu when trigger is clicked", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SeriesActionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Dizi menüsü" }));
    expect(screen.getByText("Favorilere ekle")).toBeInTheDocument();
  });

  it("calls onToggleFavorite when favorite action is chosen", async () => {
    const user = userEvent.setup();
    const onToggleFavorite = vi.fn();
    await renderWithProviders(
      <SeriesActionsMenu {...baseProps} onToggleFavorite={onToggleFavorite} />,
    );
    await user.click(screen.getByRole("button", { name: "Dizi menüsü" }));
    await user.click(screen.getByText("Favorilere ekle"));
    expect(onToggleFavorite).toHaveBeenCalledOnce();
  });

  it("names the popover dialog via aria-label", async () => {
    const user = userEvent.setup();
    const { container } = await renderWithProviders(<SeriesActionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Dizi menüsü" }));
    expect(screen.getByRole("dialog", { name: "Dizi menüsü" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers use-as-cover when onUseAsCover is provided", async () => {
    const user = userEvent.setup();
    const onUseAsCover = vi.fn();
    await renderWithProviders(<SeriesActionsMenu {...baseProps} onUseAsCover={onUseAsCover} />);
    await user.click(screen.getByRole("button", { name: "Dizi menüsü" }));
    await user.click(screen.getByText("Use as profile cover"));
    expect(onUseAsCover).toHaveBeenCalledOnce();
  });

  it("hides use-as-cover when onUseAsCover is omitted", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SeriesActionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Dizi menüsü" }));
    expect(screen.queryByText("Use as profile cover")).not.toBeInTheDocument();
  });
});
