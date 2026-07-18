import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { Modal } from "./Modal.tsx";

describe("Modal", () => {
  it("renders dialog role when open", () => {
    renderWithProviders(
      <Modal isOpen onClose={() => {}} title="Confirm">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(
      <Modal isOpen={false} onClose={() => {}} title="Confirm">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <Modal isOpen onClose={onClose} title="Confirm">
        <p>Body</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <Modal isOpen onClose={onClose} title="Confirm">
        <p>Body</p>
      </Modal>,
    );
    const backdrop = screen.getByRole("button", { name: "Kapat" });
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
