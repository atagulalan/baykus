import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { AppTabBar } from "./AppTabBar.tsx";

describe("AppTabBar", () => {
  it("renders icon tabs on transparent chrome (edge scrub is a separate layer)", async () => {
    renderWithProviders(<AppTabBar profileHandle="me" />, { withRouter: true });

    const search = await screen.findByRole("link", { name: "Ara" });
    const watch = screen.getByRole("link", { name: "İzleme" });
    const calendar = screen.getByRole("link", { name: "Takvim" });
    const profile = screen.getByRole("link", { name: "Profil" });
    const bar = document.querySelector("[data-app-tabbar]");

    expect(bar).not.toBeNull();
    // Fade/blur lives in AppEdgeBlur under chrome — not painted on the tab bar.
    expect((bar as HTMLElement).style.backgroundImage).toBe("");

    const row = watch.parentElement;
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByRole("link", { name: "Takvim" })).toBe(calendar);
    expect(within(row as HTMLElement).getByRole("link", { name: "Profil" })).toBe(profile);
    expect(within(row as HTMLElement).getByRole("link", { name: "Ara" })).toBe(search);

    // Order: Watch → Calendar → Profile → Search
    expect(watch.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(calendar.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(profile.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
