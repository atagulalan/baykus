import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { StepperInput } from "./StepperInput.tsx";

const labels = {
  decrease: "Decrease",
  increase: "Increase",
  value: "Days",
};

const meta = {
  title: "atoms/StepperInput",
  component: StepperInput,
  decorators: [voidDecorator],
} satisfies Meta<typeof StepperInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WatchingWindow: Story = {
  args: {
    value: 14,
    onChange: () => {},
    labels,
    min: 1,
    max: 90,
  },
  render: function Render() {
    const [value, setValue] = useState(14);
    return <StepperInput value={value} onChange={setValue} labels={labels} min={1} max={90} />;
  },
};
