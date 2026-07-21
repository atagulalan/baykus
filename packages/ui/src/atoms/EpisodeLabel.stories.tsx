import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { EpisodeLabel } from "./EpisodeLabel.tsx";

const meta = {
  title: "atoms/EpisodeLabel",
  component: EpisodeLabel,
  decorators: [voidDecorator],
} satisfies Meta<typeof EpisodeLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SxEy: Story = {
  args: { s: 1, e: 6, format: "SxEy", className: "text-snow" },
};

export const Formats: Story = {
  args: { s: 2, e: 3, format: "SxEy" },
  render: () => (
    <View className="gap-2">
      <EpisodeLabel s={2} e={3} format="SxEy" className="text-snow" />
      <EpisodeLabel s={2} e={3} format="S01E06" className="text-snow" />
      <EpisodeLabel s={2} e={3} format="compact" className="text-snow" />
    </View>
  ),
};
