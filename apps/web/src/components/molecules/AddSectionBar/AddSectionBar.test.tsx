import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { AddSectionBar, reorderCombined, reorderSections } from "./AddSectionBar.tsx";

function mockMobileViewport() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function mockDesktopViewport() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("min-width: 640px"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("reorderSections", () => {
  it("moves an item down", () => {
    expect(reorderSections(["watching", "not_watched_recently", "up_to_date"], 0, 1)).toEqual([
      "not_watched_recently",
      "watching",
      "up_to_date",
    ]);
  });

  it("moves an item up", () => {
    expect(reorderSections(["watching", "not_watched_recently", "up_to_date"], 2, 0)).toEqual([
      "up_to_date",
      "watching",
      "not_watched_recently",
    ]);
  });

  it("returns a copy when unchanged", () => {
    const input = ["watching", "not_watched_recently"] as const;
    expect(reorderSections(input, 0, 0)).toEqual([...input]);
  });
});

describe("reorderCombined", () => {
  // combined = [watching, up_to_date | not_started, finished], activeCount = 2
  const combined = ["watching", "up_to_date", "not_started", "finished"] as const;

  it("reorders within the active zone", () => {
    expect(reorderCombined(combined, 2, 0, 1)).toEqual(["up_to_date", "watching"]);
  });

  it("inserts an available row dragged above the boundary", () => {
    expect(reorderCombined(combined, 2, 2, 1)).toEqual(["watching", "not_started", "up_to_date"]);
  });

  it("drops an active row dragged into the available zone", () => {
    expect(reorderCombined(combined, 2, 1, 2)).toEqual(["watching"]);
  });

  it("leaves the active list unchanged when reordering within the available zone", () => {
    expect(reorderCombined(combined, 2, 2, 3)).toEqual(["watching", "up_to_date"]);
  });

  it("clamps non-removable rows so they can never leave the active zone", () => {
    // watching is non-removable; dragging it into the available zone keeps it active
    expect(reorderCombined(combined, 2, 0, 3)).toEqual(["up_to_date", "watching"]);
  });
});

describe("AddSectionBar", () => {
  it("renders the manage button", () => {
    renderWithProviders(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={() => {}}
        onSortChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Kategorileri yönet" })).toBeInTheDocument();
  });

  it("opens the modal with current sections and add options", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={() => {}}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("İzleniyor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daha başlanmadı ekle" })).toBeInTheDocument();
  });

  it("calls onSectionsChange when adding a category", async () => {
    const user = userEvent.setup();
    const onSectionsChange = vi.fn();
    renderWithProviders(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={onSectionsChange}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    await user.click(screen.getByRole("button", { name: "Daha başlanmadı ekle" }));
    expect(onSectionsChange).toHaveBeenCalledWith([
      "watching",
      "not_watched_recently",
      "not_started",
    ]);
  });

  it("marks non-removable sections with a pin instead of a remove button", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={() => {}}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    // watching can't be removed → pinned marker, only one remove button (for the other row)
    expect(screen.getByRole("img", { name: "Sabit kategori — kaldırılamaz" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Kategoriyi kaldır" })).toHaveLength(1);
  });

  it("calls onSortChange when the sort select changes", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderWithProviders(
      <AddSectionBar
        sections={["watching"]}
        sectionSorts={{ watching: "lastWatched" }}
        onSectionsChange={() => {}}
        onSortChange={onSortChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    await user.selectOptions(screen.getByRole("combobox"), "title");
    expect(onSortChange).toHaveBeenCalledWith("watching", "title");
  });

  it("exposes draggable rows for reordering", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={() => {}}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    expect(
      screen.getByRole("listitem", { name: "İzleniyor — sıralamak için sürükle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "Bir süredir izlenmedi — sıralamak için sürükle" }),
    ).toBeInTheDocument();
  });

  it("removes a section immediately without a confirm dialog", async () => {
    const user = userEvent.setup();
    const onSectionsChange = vi.fn();
    renderWithProviders(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={onSectionsChange}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    await user.click(screen.getByRole("button", { name: "Kategoriyi kaldır" }));
    expect(onSectionsChange).toHaveBeenCalledWith(["watching"]);
    expect(screen.queryByText(/emin misin/i)).not.toBeInTheDocument();
  });
});

describe("AddSectionBar sortOnly", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a sort dialog with the full category list and no manage affordances", async () => {
    mockMobileViewport();
    const user = userEvent.setup();
    renderWithProviders(
      <AddSectionBar
        mode="sortOnly"
        sections={["watching", "finished", "stopped"]}
        sectionSorts={{ watching: "lastWatched" }}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sıralama" }));
    expect(screen.getByRole("dialog", { name: "Sıralama" })).toBeInTheDocument();
    expect(screen.getByText("İzleniyor")).toBeInTheDocument();
    expect(screen.getByText("Bitirildi")).toBeInTheDocument();
    expect(screen.queryByText("Kategori ekle")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kategoriyi kaldır" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("listitem", { name: "İzleniyor — sıralamak için sürükle" }),
    ).not.toBeInTheDocument();
  });

  it("omits fixed-order categories such as needs_review from the sort list", async () => {
    mockMobileViewport();
    const user = userEvent.setup();
    renderWithProviders(
      <AddSectionBar
        mode="sortOnly"
        sections={["needs_review", "watching", "finished"]}
        sectionSorts={{}}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sıralama" }));
    expect(screen.getByText("İzleniyor")).toBeInTheDocument();
    expect(screen.getByText("Bitirildi")).toBeInTheDocument();
    expect(screen.queryByText("İnceleme bekliyor")).not.toBeInTheDocument();
  });

  it("calls onSortChange when a sort list option is chosen", async () => {
    mockMobileViewport();
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderWithProviders(
      <AddSectionBar
        mode="sortOnly"
        sections={["watching"]}
        sectionSorts={{ watching: "lastWatched" }}
        onSortChange={onSortChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sıralama" }));
    const dialog = screen.getByRole("dialog", { name: "Sıralama" });
    const options = within(dialog).getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    const titleOption = options.find((node) => node.textContent?.includes("Başlık"));
    expect(titleOption).toBeDefined();
    fireEvent.click(titleOption as HTMLElement);
    expect(onSortChange).toHaveBeenCalledWith("watching", "title");
  });

  it("opens a desktop sort popover anchored to the trigger", async () => {
    mockDesktopViewport();
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 100,
      y: 200,
      width: 120,
      height: 40,
      top: 200,
      left: 100,
      right: 220,
      bottom: 240,
      toJSON: () => ({}),
    }));
    const user = userEvent.setup();
    renderWithProviders(
      <AddSectionBar
        mode="sortOnly"
        sections={["watching"]}
        sectionSorts={{ watching: "lastWatched" }}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sıralama" }));
    expect(screen.getByRole("dialog", { name: "Sıralama" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Başlık" })).toBeInTheDocument();
  });
});
