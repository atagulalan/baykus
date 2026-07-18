import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { noop } from "../../../../.storybook/mocks.ts";
import { SegmentedButtonGroup } from "./SegmentedButtonGroup.tsx";

const meta = {
  title: "Atoms/SegmentedButtonGroup",
  component: SegmentedButtonGroup,
  args: {
    value: "list",
    options: [
      { value: "list", label: "List" },
      { value: "grid", label: "Grid" },
    ],
    onChange: noop,
  },
} satisfies Meta<typeof SegmentedButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Interactive: Story = {
  render: function InteractiveSegmented(args) {
    const [value, setValue] = useState(args.value);
    return <SegmentedButtonGroup {...args} value={value} onChange={setValue} />;
  },
};
