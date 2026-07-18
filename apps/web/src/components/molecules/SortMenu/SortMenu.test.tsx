import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { SortMenu } from "./SortMenu.tsx";

vi.mock("../../../api/client.ts", () => ({
  getSettings: vi.fn(),
  getSeriesByParam: vi.fn(),
  uploadAvatar: vi.fn(),
  updateSettings: vi.fn(),
  prefetch: vi.fn(),
}));

describe("SortMenu", () => {
  it("renders sort button with accessible label", async () => {
    await renderWithProviders(<SortMenu sort="lastWatched" onChange={vi.fn()} idSuffix="test" />);
    expect(screen.getByRole("button", { name: "Sıralama" })).toBeInTheDocument();
  });

  it("calls onChange when a sort option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    await renderWithProviders(
      <SortMenu
        sort="lastWatched"
        onChange={onChange}
        options={["lastWatched", "title"]}
        idSuffix="test"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Sıralama" }));
    await user.click(screen.getByLabelText("Başlık"));
    expect(onChange).toHaveBeenCalledWith("title");
  });
});
