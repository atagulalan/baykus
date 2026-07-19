import type { Meta, StoryObj } from "@storybook/react-vite";
import { Play } from "lucide-react";
import { SectionHeader } from "./SectionHeader.tsx";

const meta = {
  title: "Molecules/SectionHeader",
  component: SectionHeader,
  args: {
    icon: Play,
    label: "Watching",
    count: 12,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ListInset: Story = { args: { inset: "list" } };

export const Collapsible: Story = {
  args: {
    onClick: () => {},
    expanded: true,
  },
};

export const Collapsed: Story = {
  args: {
    onClick: () => {},
    expanded: false,
  },
};
