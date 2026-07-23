import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { View } from "react-native";
import { AirDateLabel } from "./AirDateLabel.tsx";

const meta = {
  title: "atoms/AirDateLabel",
  component: AirDateLabel,
  args: {
    airDate: "2024-11-27",
    locale: "tr",
  },
} satisfies Meta<typeof AirDateLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Absolute: Story = {
  args: { absolute: true },
};

export const RelativeNear: Story = {
  args: {
    airDate: "2026-07-18",
    today: "2026-07-18",
  },
};

export const RelativeYesterday: Story = {
  args: {
    airDate: "2026-07-17",
    today: "2026-07-18",
  },
};

export const SideBySide: Story = {
  render: (args) => (
    <View className="gap-2">
      <AirDateLabel {...args} absolute />
      <AirDateLabel {...args} airDate="2026-07-18" today="2026-07-18" />
    </View>
  ),
};
