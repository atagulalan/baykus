import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateSettings } from "./client.ts";
import { configureApiClient } from "./config.ts";
import type { UiPrefsDto } from "./types.ts";

const emptyPrefsPatch: UiPrefsDto = {
  libraryBrowse: { sort: "title", category: [] },
  watchSections: [],
  watchSectionSorts: {},
  historyCollapsed: false,
  skipSectionRemoveConfirm: false,
  showNextUpCarousel: true,
  browseView: "list",
};

describe("authHeaders CSRF (E119)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    configureApiClient({ transport: "cookie", baseUrl: "" });
  });

  it("sends X-Baykus on cookie transport", async () => {
    configureApiClient({ transport: "cookie", baseUrl: "http://localhost:4004" });
    await updateSettings({ uiPrefs: emptyPrefsPatch });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit);
    expect(headers.get("X-Baykus")).toBe("1");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("omits X-Baykus when Bearer token is present", async () => {
    configureApiClient({
      transport: "bearer",
      baseUrl: "http://localhost:4004",
      getAccessToken: async () => "tok",
    });
    await updateSettings({ uiPrefs: emptyPrefsPatch });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer tok");
    expect(headers.get("X-Baykus")).toBeNull();
  });

  it("sends X-Baykus on bearer transport when there is no access token", async () => {
    configureApiClient({
      transport: "bearer",
      baseUrl: "http://localhost:4004",
      getAccessToken: async () => null,
    });
    await updateSettings({ uiPrefs: emptyPrefsPatch });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit);
    expect(headers.get("X-Baykus")).toBe("1");
    expect(headers.get("Authorization")).toBeNull();
  });
});
