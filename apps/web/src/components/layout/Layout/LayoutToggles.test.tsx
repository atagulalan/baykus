/**
 * Header action tests against the *real* router — the point is that
 * `MobileHeaderAction` picks its control from `location.pathname`, which flips
 * to the destination while the navigation is still pending, so the matching
 * route need not be resolved yet when the control first renders.
 *
 * Limitations (not covered here — needs browser/e2e):
 * - The pull-to-history gesture that produces the pending window in practice
 * - Toggle navigation results (search-param round trip is a route-level concern)
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { MobileHeaderAction } from "./LayoutToggles.tsx";

describe("MobileHeaderAction", () => {
  it("renders the history sort toggle when /watch/history has no active match", async () => {
    // The test router only knows `/` and `/series/$id`, standing in for the
    // window where the pathname has advanced but the match has not landed.
    renderWithProviders(<MobileHeaderAction pathname="/watch/history" />, { withRouter: true });

    // Icon-only control, so `renderWithRouter`'s text-content wait never settles.
    const toggle = await screen.findByRole("button", { name: "Sıralama" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});
