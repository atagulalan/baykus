import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { View } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { Checkbox } from "./Checkbox.tsx";

const meta = {
  title: "atoms/Checkbox",
  component: Checkbox,
  decorators: [voidDecorator],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    onChange: () => {},
  },
  render: function Render() {
    const [checked, setChecked] = useState(false);
    return <Checkbox checked={checked} onChange={setChecked} />;
  },
};

export const Rounded: Story = {
  args: {
    checked: true,
    onChange: () => {},
    variant: "rounded",
  },
  render: function Render() {
    const [checked, setChecked] = useState(true);
    return (
      <View className="flex-row gap-3">
        <Checkbox checked={checked} onChange={setChecked} variant="rounded" />
        <Checkbox checked={!checked} onChange={(v) => setChecked(!v)} variant="rounded" />
      </View>
    );
  },
};
