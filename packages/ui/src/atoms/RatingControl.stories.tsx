import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { RatingControl, type RatingValue } from "./RatingControl.tsx";

const labels = {
  group: "Rating",
  bad: "kötü",
  okay: "normal",
  good: "iyi",
};

const meta = {
  title: "atoms/RatingControl",
  component: RatingControl,
  decorators: [voidDecorator],
} satisfies Meta<typeof RatingControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 2,
    onChange: () => {},
    labels,
  },
  render: function Render() {
    const [value, setValue] = useState<RatingValue | null>(2);
    return <RatingControl value={value} onChange={setValue} labels={labels} />;
  },
};

export const IconsOnly: Story = {
  args: {
    value: 3,
    onChange: () => {},
    labels,
    iconsOnly: true,
  },
  render: function Render() {
    const [value, setValue] = useState<RatingValue | null>(3);
    return <RatingControl value={value} onChange={setValue} labels={labels} iconsOnly />;
  },
};
