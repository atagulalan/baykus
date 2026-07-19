import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { SectionPill } from "./SectionPill.tsx";

function blurFocus(canvasElement: HTMLElement) {
  (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
}

const meta = {
  title: "Atoms/SectionPill",
  component: SectionPill,
  args: {
    children: "Watching",
  },
  decorators: [
    (Story) => (
      <div className="flex justify-center bg-void p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SectionPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole("heading", { level: 2, name: "Watching" });
    expect(heading).toHaveClass("rounded-full");
    expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const Highlighted: Story = {
  args: {
    children: "Today",
    className: "text-sm font-semibold text-yellow",
  },
};

/** Calendar-style scroll-to-section label button. */
export const Clickable: Story = {
  args: {
    children: "Earlier",
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Earlier" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
    blurFocus(canvasElement);
  },
};

/** splitLabel + onClick (SectionHeader collapsible via SectionPill). */
export const SplitClickable: Story = {
  args: {
    padding: "splitLabel",
    onClick: fn(),
    children: (
      <>
        <span className="min-w-0 truncate font-semibold text-sm text-snow">Watching</span>
        <span className="shrink-0 text-muted/35" aria-hidden>
          |
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted">12</span>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("py-0");
    expect(heading).toHaveClass("px-2.5");
    await userEvent.click(canvas.getByRole("button", { name: /Watching.*12/ }));
    await expect(args.onClick).toHaveBeenCalledOnce();
    blurFocus(canvasElement);
  },
};
