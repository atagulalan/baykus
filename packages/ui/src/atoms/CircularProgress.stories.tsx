import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { CircularProgress } from "./CircularProgress.tsx";

const meta = {
  title: "atoms/CircularProgress",
  component: CircularProgress,
  decorators: [voidDecorator],
} satisfies Meta<typeof CircularProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  args: { value: 45 },
  render: () => (
    <View className="flex-row items-center gap-4">
      <CircularProgress value={45} />
      <CircularProgress value={100} complete />
      <CircularProgress value={100} caughtUp />
    </View>
  ),
};
