import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { noop } from "../../../../.storybook/mocks.ts";
import { StepperInput } from "./StepperInput.tsx";

const meta = {
  title: "Atoms/StepperInput",
  component: StepperInput,
  args: {
    value: 14,
    onChange: noop,
    min: 1,
    max: 90,
  },
} satisfies Meta<typeof StepperInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AtMin: Story = { args: { value: 1 } };

export const Interactive: Story = {
  render: function InteractiveStepper(args) {
    const [value, setValue] = useState(args.value);
    return <StepperInput {...args} value={value} onChange={setValue} />;
  },
};
