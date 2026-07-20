import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "./Accordion.tsx";

const meta = {
  title: "Atoms/Accordion",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const bodyClass = "px-3 py-3 font-mono text-sm text-muted";
const triggerClass =
  "flex w-full items-center justify-between border border-white/10 px-3 py-2 text-left font-mono text-xs uppercase tracking-widest text-snow transition-colors hover:bg-white/5";

function DemoBody({ lines = 4 }: { lines?: number }) {
  const items = Array.from({ length: lines }, (_, i) => `Episode line ${i + 1}`);
  return (
    <div className={bodyClass}>
      {items.map((text) => (
        <p key={text} className="py-1">
          {text} — height scales with content so speed stays constant.
        </p>
      ))}
    </div>
  );
}

export const Exclusive: Story = {
  render: function ExclusiveAccordion() {
    return (
      <Accordion
        type="single"
        defaultValue="s1"
        collapsible
        className="flex max-w-md flex-col gap-2"
      >
        <AccordionItem value="s1" className="overflow-hidden border border-white/10">
          <AccordionTrigger className={triggerClass}>Season 1</AccordionTrigger>
          <AccordionContent>
            <DemoBody lines={6} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="s2" className="overflow-hidden border border-white/10">
          <AccordionTrigger className={triggerClass}>Season 2</AccordionTrigger>
          <AccordionContent>
            <DemoBody lines={10} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="s3" className="overflow-hidden border border-white/10">
          <AccordionTrigger className={triggerClass}>Season 3</AccordionTrigger>
          <AccordionContent>
            <DemoBody lines={3} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  },
};

export const Multiple: Story = {
  render: function MultipleAccordion() {
    return (
      <Accordion type="multiple" defaultValue={["a"]} className="flex max-w-md flex-col gap-2">
        <AccordionItem value="a" className="overflow-hidden border border-white/10">
          <AccordionTrigger className={triggerClass}>Watching</AccordionTrigger>
          <AccordionContent unmountOnExit={false}>
            <DemoBody lines={4} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="b" className="overflow-hidden border border-white/10">
          <AccordionTrigger className={triggerClass}>Up next</AccordionTrigger>
          <AccordionContent unmountOnExit={false}>
            <DemoBody lines={4} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  },
};

export const SpeedPlayground: Story = {
  render: function SpeedPlaygroundStory() {
    const [open, setOpen] = useState(true);
    const [speed, setSpeed] = useState(1400);
    const [easing, setEasing] = useState<"emphasized" | "easeOutCubic" | "easeOutExpo" | "linear">(
      "emphasized",
    );

    return (
      <div className="flex max-w-md flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
          <label className="flex items-center gap-2">
            speed
            <input
              type="range"
              min={400}
              max={4000}
              step={100}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <span className="tabular-nums text-snow">{speed} px/s</span>
          </label>
          <label className="flex items-center gap-2">
            easing
            <select
              value={easing}
              onChange={(e) => setEasing(e.target.value as typeof easing)}
              className="border border-white/10 bg-transparent px-2 py-1 text-snow"
            >
              <option value="emphasized">emphasized</option>
              <option value="easeOutCubic">easeOutCubic</option>
              <option value="easeOutExpo">easeOutExpo</option>
              <option value="linear">linear</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="border border-white/10 px-3 py-1 text-snow hover:bg-white/5"
          >
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
        <AccordionPanel
          open={open}
          speed={speed}
          easing={easing}
          unmountOnExit={false}
          className="border border-white/10"
        >
          <DemoBody lines={12} />
        </AccordionPanel>
      </div>
    );
  },
};

export const StandalonePanel: Story = {
  render: function Standalone() {
    const [open, setOpen] = useState(false);
    return (
      <div className="max-w-md">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={triggerClass}
        >
          Custom trigger + AccordionPanel
        </button>
        <AccordionPanel open={open} unmountOnExit speed={1600} easing="easeOutQuint">
          <DemoBody lines={5} />
        </AccordionPanel>
      </div>
    );
  },
};
