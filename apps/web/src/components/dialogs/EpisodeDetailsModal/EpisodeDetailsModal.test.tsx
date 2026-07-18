import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { EpisodeDetailsModal } from "./EpisodeDetailsModal.tsx";

describe("EpisodeDetailsModal (render)", () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    s: 3,
    e: 5,
    episodeTitle: "Más",
    airDate: "2009-04-06",
    episodeType: "standard" as const,
    overview: "Walter tries to gain control.",
    stillRef: null,
  };

  it("renders episode title and overview when open", () => {
    renderWithProviders(<EpisodeDetailsModal {...baseProps} />);
    expect(screen.getByText("Más")).toBeInTheDocument();
    expect(screen.getByText("Walter tries to gain control.")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(<EpisodeDetailsModal {...baseProps} open={false} />);
    expect(screen.queryByText("Más")).not.toBeInTheDocument();
  });

  it("calls onClose when close control is activated", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<EpisodeDetailsModal {...baseProps} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalled();
  });
});
