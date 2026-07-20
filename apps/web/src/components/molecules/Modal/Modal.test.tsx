import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import { Modal } from "./Modal.tsx";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  vi.useRealTimers();
  document.body.style.overflow = "";
});

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

describe("Modal", () => {
  it("renders dialog role when open", () => {
    mockDesktopViewport();
    renderWithProviders(
      <Modal isOpen onClose={() => {}} title="Confirm">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    mockDesktopViewport();
    renderWithProviders(
      <Modal isOpen={false} onClose={() => {}} title="Confirm">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    mockDesktopViewport();
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
    mockDesktopViewport();
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <Modal isOpen onClose={onClose} title="Confirm">
        <p>Body</p>
      </Modal>,
    );
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInstanceOf(HTMLElement);
    await user.click(backdrop as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves initial focus to the first focusable element in the dialog", () => {
    mockDesktopViewport();
    renderWithProviders(
      <Modal isOpen onClose={() => {}}>
        <button type="button">First action</button>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "First action" })).toHaveFocus();
  });

  it("restores focus to the trigger when closed", async () => {
    mockDesktopViewport();
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open modal
          </button>
          <Modal isOpen={open} onClose={() => setOpen(false)}>
            <button type="button">Inside modal</button>
          </Modal>
        </>
      );
    }

    renderWithProviders(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open modal" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("traps Tab focus within the dialog", async () => {
    mockDesktopViewport();
    const user = userEvent.setup();
    renderWithProviders(
      <Modal isOpen onClose={() => {}}>
        <button type="button">One</button>
        <button type="button">Two</button>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Two" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
  });

  it("wires aria-labelledby and aria-describedby for sheet titles", () => {
    mockMobileViewport();
    renderWithProviders(
      <Modal isOpen onClose={() => {}} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");
    expect(screen.getByRole("heading", { name: "Sheet title" })).toHaveAttribute("id");
  });

  it("has no axe violations when open with labelled content", async () => {
    mockDesktopViewport();
    const { container } = renderWithProviders(
      <Modal isOpen onClose={() => {}}>
        <h2>Dialog title</h2>
        <p>Dialog body</p>
        <button type="button">Confirm</button>
      </Modal>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("closes the sheet from the header X button", async () => {
    mockMobileViewport();
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <Modal isOpen onClose={onClose} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses max-w-lg for large desktop modals", () => {
    mockDesktopViewport();
    renderWithProviders(
      <Modal isOpen onClose={() => {}} title="Details" size="large">
        <p>Body</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-w-lg");
  });

  it("renders an iOS-like sheet handle and top radius on mobile", () => {
    mockMobileViewport();
    renderWithProviders(
      <Modal isOpen onClose={() => {}} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("rounded-t-[1.5rem]");
    expect(dialog.querySelector(".h-1.w-9.rounded-full")).toBeTruthy();
  });

  it("dismisses the sheet when dragged down past the threshold", () => {
    mockMobileViewport();
    const onClose = vi.fn();
    renderWithProviders(
      <Modal isOpen onClose={onClose} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    const handleZone = dialog.querySelector(".touch-none");
    expect(handleZone).toBeInstanceOf(HTMLElement);
    if (!(handleZone instanceof HTMLElement)) return;

    // jsdom has no PointerEvent — mouse path is the test/runtime fallback.
    fireEvent.mouseDown(handleZone, { button: 0, clientY: 100 });
    fireEvent.mouseMove(handleZone, { clientY: 220 });
    fireEvent.mouseUp(handleZone, { clientY: 220 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the sheet offset while closing after a drag dismiss", () => {
    mockMobileViewport();
    const onClose = vi.fn();
    const { rerender } = renderWithProviders(
      <Modal isOpen onClose={onClose} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    const handleZone = dialog.querySelector(".touch-none");
    expect(handleZone).toBeInstanceOf(HTMLElement);
    if (!(handleZone instanceof HTMLElement)) return;

    fireEvent.mouseDown(handleZone, { button: 0, clientY: 100 });
    fireEvent.mouseMove(handleZone, { clientY: 220 });
    fireEvent.mouseUp(handleZone, { clientY: 220 });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal isOpen={false} onClose={onClose} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const closing = screen.getByRole("dialog");
    expect(closing.style.transform).toMatch(/translateY\(/);
    expect(closing.className).not.toContain("animate-sheet-out");
  });

  it("resets sheet offset so reopen slides in after a drag dismiss", () => {
    mockMobileViewport();
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = renderWithProviders(
      <Modal isOpen onClose={onClose} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    const handleZone = dialog.querySelector(".touch-none");
    expect(handleZone).toBeInstanceOf(HTMLElement);
    if (!(handleZone instanceof HTMLElement)) return;

    fireEvent.mouseDown(handleZone, { button: 0, clientY: 100 });
    fireEvent.mouseMove(handleZone, { clientY: 220 });
    fireEvent.mouseUp(handleZone, { clientY: 220 });

    rerender(
      <Modal isOpen={false} onClose={onClose} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender(
      <Modal isOpen onClose={onClose} title="Sheet title">
        <p>Body copy</p>
      </Modal>,
    );

    const reopened = screen.getByRole("dialog");
    expect(reopened.style.transform).toBe("");
    expect(reopened.className).toContain("animate-sheet");
    vi.useRealTimers();
  });

  it("restores body scroll after stacked modals close in either order", () => {
    mockDesktopViewport();
    vi.useFakeTimers();
    document.body.style.overflow = "";

    function Harness({
      outerOpen,
      innerOpen,
    }: {
      outerOpen: boolean;
      innerOpen: boolean;
    }) {
      return (
        <>
          <Modal isOpen={outerOpen} onClose={() => {}}>
            <p>Outer</p>
          </Modal>
          <Modal isOpen={innerOpen} onClose={() => {}}>
            <p>Inner</p>
          </Modal>
        </>
      );
    }

    const { rerender } = renderWithProviders(<Harness outerOpen innerOpen />);
    expect(document.body.style.overflow).toBe("hidden");

    // Close outer first while inner stays open — must remain locked.
    rerender(<Harness outerOpen={false} innerOpen />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(document.body.style.overflow).toBe("hidden");

    // Close inner — unlock after its exit animation.
    rerender(<Harness outerOpen={false} innerOpen={false} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(document.body.style.overflow).toBe("");

    // Re-open both, then close together (Escape-style) — must not stick locked.
    rerender(<Harness outerOpen innerOpen />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Harness outerOpen={false} innerOpen={false} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(document.body.style.overflow).toBe("");
  });

  it("Escape closes only the topmost stacked modal", () => {
    mockDesktopViewport();
    const onCloseOuter = vi.fn();
    const onCloseInner = vi.fn();
    renderWithProviders(
      <>
        <Modal isOpen onClose={onCloseOuter}>
          <p>Outer</p>
        </Modal>
        <Modal isOpen onClose={onCloseInner}>
          <p>Inner</p>
        </Modal>
      </>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseInner).toHaveBeenCalledTimes(1);
    expect(onCloseOuter).not.toHaveBeenCalled();
  });

  it("names popover dialogs via aria-label from title prop", () => {
    mockDesktopViewport();
    renderWithProviders(
      <span className="relative inline-flex">
        <Modal
          isOpen
          onClose={() => {}}
          desktop="popover"
          popoverClassName="w-56 p-3"
          title="Sort options"
        >
          <fieldset>
            <label>
              <input type="radio" name="sort" /> Title
            </label>
          </fieldset>
        </Modal>
      </span>,
    );

    expect(screen.getByRole("dialog", { name: "Sort options" })).toBeInTheDocument();
  });

  it("centers a popover on its anchor when popoverAlign is center", () => {
    mockDesktopViewport();
    renderWithProviders(
      <span className="relative inline-flex">
        <Modal
          isOpen
          onClose={() => {}}
          desktop="popover"
          popoverAlign="center"
          popoverClassName="w-56 p-3"
          title="Season menu"
        >
          <button type="button">Mark season watched</button>
        </Modal>
      </span>,
    );

    const dialog = screen.getByRole("dialog", { name: "Season menu" });
    expect(dialog.style.translate).toBe("-50% 0");
    expect(dialog.style.left).not.toBe("");
    expect(dialog.style.right).toBe("");
  });

  it("places an end-top popover left of its anchor, top-aligned", () => {
    mockDesktopViewport();
    renderWithProviders(
      <span className="relative inline-flex">
        <Modal
          isOpen
          onClose={() => {}}
          desktop="popover"
          popoverAlign="end-top"
          popoverClassName="w-56 p-3"
          title="Episode menu"
        >
          <button type="button">Watch again</button>
        </Modal>
      </span>,
    );

    const dialog = screen.getByRole("dialog", { name: "Episode menu" });
    expect(dialog.style.translate).toBe("");
    expect(dialog.style.right).not.toBe("");
    expect(dialog.style.left).toBe("");
  });

  it("names desktop modals via aria-labelledby when title prop is set", () => {
    mockDesktopViewport();
    renderWithProviders(
      <Modal isOpen onClose={() => {}} title="Manage sections">
        <ul>
          <li>Watching</li>
        </ul>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Manage sections" });
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(screen.getByRole("heading", { name: "Manage sections" })).toBeInTheDocument();
  });

  it("applies className padding on desktop even without a title prop", () => {
    mockDesktopViewport();
    renderWithProviders(
      <Modal isOpen onClose={() => {}} className="flex flex-col gap-3 p-4">
        <h2>Emin misiniz?</h2>
        <p>Body copy</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    const body = dialog.querySelector(".p-4");
    expect(body).not.toBeNull();
    expect(body).toContainElement(screen.getByRole("heading", { name: "Emin misiniz?" }));
  });

  it("has no axe violations for popover with title prop", async () => {
    mockDesktopViewport();
    const { container } = renderWithProviders(
      <span className="relative inline-flex">
        <Modal
          isOpen
          onClose={() => {}}
          desktop="popover"
          popoverClassName="w-56 p-3"
          title="Sort options"
        >
          <fieldset>
            <label>
              <input type="radio" name="sort" /> Title
            </label>
          </fieldset>
        </Modal>
      </span>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
