import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { noop } from "../../../../.storybook/mocks.ts";
import { RatingControl } from "./RatingControl.tsx";

const meta = {
  title: "Atoms/RatingControl",
  component: RatingControl,
  args: {
    value: null,
    onChange: noop,
  },
} satisfies Meta<typeof RatingControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const RatedGood: Story = { args: { value: 3 } };

export const Small: Story = { args: { size: "sm", value: 2 } };

export const Interactive: Story = {
  render: function InteractiveRating(args) {
    const [value, setValue] = useState<1 | 2 | 3 | null>(args.value);
    return <RatingControl {...args} value={value} onChange={setValue} />;
  },
};
