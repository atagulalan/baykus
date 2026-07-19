import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatTile } from "./StatTile.tsx";

const meta = {
  title: "Stats/StatTile",
  component: StatTile,
  args: {
    label: "Episodes watched",
    value: "842",
    sub: "all time",
  },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutSub: Story = {
  args: {
    label: "Episodes watched",
    value: "842",
  },
};

export const Compact: Story = {
  args: {
    label: "Time spent",
    value: "7m 3d 8h",
    size: "compact",
    sub: undefined,
  },
};
