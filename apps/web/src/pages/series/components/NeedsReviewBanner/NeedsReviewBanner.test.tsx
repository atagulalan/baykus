import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../test/renderWithProviders.tsx";
import { NeedsReviewBanner } from "./NeedsReviewBanner.tsx";

describe("NeedsReviewBanner", () => {
  it("renders title and action buttons", () => {
    renderWithProviders(
      <NeedsReviewBanner onFill={() => {}} onDismiss={() => {}} isLoading={false} />,
    );
    expect(screen.getByText("Eksik bölümler tespit edildi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eksikleri doldur" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yoksay" })).toBeInTheDocument();
  });

  it("calls onFill and onDismiss", async () => {
    const user = userEvent.setup();
    const onFill = vi.fn();
    const onDismiss = vi.fn();
    renderWithProviders(
      <NeedsReviewBanner onFill={onFill} onDismiss={onDismiss} isLoading={false} />,
    );

    await user.click(screen.getByRole("button", { name: "Eksikleri doldur" }));
    await user.click(screen.getByRole("button", { name: "Yoksay" }));

    expect(onFill).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
