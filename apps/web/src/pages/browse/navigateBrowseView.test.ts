import { afterEach, describe, expect, it, vi } from "vitest";
import { clearUiPrefsForTests, readUiPrefs } from "../../lib/uiPrefs.ts";
import { navigateBrowseView } from "./navigateBrowseView.ts";

afterEach(() => {
  clearUiPrefsForTests();
});

describe("navigateBrowseView", () => {
  it("persists browseView and navigates to the matching route", () => {
    const navigate = vi.fn();

    navigateBrowseView(navigate, "grid");
    expect(readUiPrefs().browseView).toBe("grid");
    expect(navigate).toHaveBeenCalledWith({ to: "/", resetScroll: false });

    navigateBrowseView(navigate, "list");
    expect(readUiPrefs().browseView).toBe("list");
    expect(navigate).toHaveBeenCalledWith({ to: "/watch", resetScroll: false });
  });
});
