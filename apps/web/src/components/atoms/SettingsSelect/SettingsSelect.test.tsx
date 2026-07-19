import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { SettingsSelect } from "./SettingsSelect.tsx";

const options = [
  { value: "SxEy" as const, label: "S3E5" },
  { value: "S01E06" as const, label: "S01E06" },
  { value: "compact" as const, label: "12×3" },
];

describe("SettingsSelect", () => {
  it("shows the selected option label", () => {
    renderWithProviders(
      <SettingsSelect
        label="Episode label format"
        value="SxEy"
        options={options}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("S3E5")).toBeInTheDocument();
  });

  it("opens the option list on row click", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SettingsSelect
        label="Episode label format"
        value="SxEy"
        options={options}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Episode label format/i }));
    expect(screen.getByRole("option", { name: /S01E06/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /12×3/ })).toBeInTheDocument();
  });

  it("calls onChange and closes when selecting an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <SettingsSelect
        label="Episode label format"
        value="SxEy"
        options={options}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Episode label format/i }));
    await user.click(screen.getByRole("option", { name: "12×3" }));
    expect(onChange).toHaveBeenCalledWith("compact");
    await waitFor(() => {
      expect(screen.queryByRole("option", { name: /S01E06/ })).not.toBeInTheDocument();
    });
  });
});
