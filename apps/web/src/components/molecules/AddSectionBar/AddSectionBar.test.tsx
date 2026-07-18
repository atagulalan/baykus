import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddSectionBar, reorderSections } from "./AddSectionBar.tsx";

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

describe("AddSectionBar", () => {
  it("renders the manage button", () => {
    render(
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
    render(
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
    expect(screen.getByRole("button", { name: "Daha başlanmadı" })).toBeInTheDocument();
  });

  it("calls onSectionsChange when adding a category", async () => {
    const user = userEvent.setup();
    const onSectionsChange = vi.fn();
    render(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={onSectionsChange}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    await user.click(screen.getByRole("button", { name: "Daha başlanmadı" }));
    expect(onSectionsChange).toHaveBeenCalledWith([
      "watching",
      "not_watched_recently",
      "not_started",
    ]);
  });

  it("calls onSortChange when the sort select changes", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
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

  it("exposes drag handles for reordering", async () => {
    const user = userEvent.setup();
    render(
      <AddSectionBar
        sections={["watching", "not_watched_recently"]}
        sectionSorts={{}}
        onSectionsChange={() => {}}
        onSortChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Kategorileri yönet" }));
    expect(
      screen.getByRole("button", { name: "İzleniyor — sıralamak için sürükle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bir süredir izlenmedi — sıralamak için sürükle" }),
    ).toBeInTheDocument();
  });

  it("removes a section immediately without a confirm dialog", async () => {
    const user = userEvent.setup();
    const onSectionsChange = vi.fn();
    render(
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
