import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./Checkbox.tsx";

const meta = {
  title: "Atoms/Checkbox",
  component: Checkbox,
  args: {
    "aria-label": "Mark watched",
    onChange: () => {},
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const ShowHint: Story = {
  args: {
    checked: false,
    showHint: true,
  },
};

export const Rounded: Story = {
  args: {
    checked: false,
    variant: "rounded",
  },
};

export const RoundedChecked: Story = {
  args: {
    checked: true,
    variant: "rounded",
  },
};

/** Interactive controlled checkbox for local click testing. */
export const Interactive: Story = {
  args: {
    checked: false,
  },
  render: function InteractiveCheckbox(args) {
    const [checked, setChecked] = useState(args.checked);
    return <Checkbox {...args} checked={checked} onChange={setChecked} />;
  },
};
