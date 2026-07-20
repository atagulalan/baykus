import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "./Accordion.tsx";

describe("AccordionPanel", () => {
  it("renders children when open and hides them when unmountOnExit closes", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <button type="button" onClick={() => setOpen((v) => !v)}>
            Toggle
          </button>
          <AccordionPanel open={open} unmountOnExit>
            <p>Panel body</p>
          </AccordionPanel>
        </div>
      );
    }

    renderWithProviders(<Harness />);
    expect(screen.getByText("Panel body")).toBeInTheDocument();
    const panel = document.querySelector('[data-slot="accordion-panel"]');
    expect(panel).toHaveAttribute("data-expanded", "true");

    await userEvent.click(screen.getByRole("button", { name: "Toggle" }));
    // jsdom heights are 0 → snap close + unmount
    await waitFor(() => {
      expect(screen.queryByText("Panel body")).not.toBeInTheDocument();
    });
    expect(document.querySelector('[data-slot="accordion-panel"]')).toHaveAttribute(
      "data-state",
      "closed",
    );
  });

  it("keeps children mounted when unmountOnExit is false", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <button type="button" onClick={() => setOpen((v) => !v)}>
            Toggle
          </button>
          <AccordionPanel open={open} unmountOnExit={false}>
            <p>Sticky body</p>
          </AccordionPanel>
        </div>
      );
    }

    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle" }));
    await waitFor(() => {
      expect(document.querySelector('[data-slot="accordion-panel"]')).toHaveAttribute(
        "data-state",
        "closed",
      );
    });
    expect(screen.getByText("Sticky body")).toBeInTheDocument();
  });

  it("fires completion callbacks", async () => {
    const onOpenComplete = vi.fn();
    const onCloseComplete = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen((v) => !v)}>
            Toggle
          </button>
          <AccordionPanel
            open={open}
            unmountOnExit
            skipEnterOnMount={false}
            onOpenComplete={onOpenComplete}
            onCloseComplete={onCloseComplete}
          >
            <p>Callback body</p>
          </AccordionPanel>
        </div>
      );
    }

    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle" }));
    await waitFor(() => expect(onOpenComplete).toHaveBeenCalledOnce());

    await userEvent.click(screen.getByRole("button", { name: "Toggle" }));
    await waitFor(() => expect(onCloseComplete).toHaveBeenCalledOnce());
  });
});

describe("Accordion compound", () => {
  it("opens one item at a time in single mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Accordion type="single" defaultValue="a" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Alpha</AccordionTrigger>
          <AccordionContent unmountOnExit={false}>A body</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Beta</AccordionTrigger>
          <AccordionContent unmountOnExit={false}>B body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-expanded", "true");
  });

  it("allows multiple open items", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Accordion type="multiple" defaultValue={["a"]}>
        <AccordionItem value="a">
          <AccordionTrigger>Alpha</AccordionTrigger>
          <AccordionContent unmountOnExit={false}>A body</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Beta</AccordionTrigger>
          <AccordionContent unmountOnExit={false}>B body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveAttribute("aria-expanded", "true");
  });

  it("supports controlled single value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState("a");
      return (
        <Accordion
          type="single"
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            setValue(typeof next === "string" ? next : (next[0] ?? ""));
          }}
        >
          <AccordionItem value="a">
            <AccordionTrigger>Alpha</AccordionTrigger>
            <AccordionContent unmountOnExit={false}>A</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Beta</AccordionTrigger>
            <AccordionContent unmountOnExit={false}>B</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    renderWithProviders(<Harness />);
    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("collapses the open item when collapsible", async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderWithProviders(
        <Accordion type="single" defaultValue="a" collapsible>
          <AccordionItem value="a">
            <AccordionTrigger>Alpha</AccordionTrigger>
            <AccordionContent unmountOnExit={false}>A body</AccordionContent>
          </AccordionItem>
        </Accordion>,
      );
    });

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-expanded", "false");
  });
});
