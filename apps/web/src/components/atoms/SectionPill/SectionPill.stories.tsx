import type { Meta, StoryObj } from "@storybook/react-vite";
import { SectionPill } from "./SectionPill.tsx";

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

export const Default: Story = {};

export const Highlighted: Story = {
  args: {
    children: "Today",
    className: "text-sm font-semibold text-yellow",
  },
};
