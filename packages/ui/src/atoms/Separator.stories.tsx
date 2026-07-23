import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { Text, View } from "react-native";
import { Separator } from "./Separator.tsx";

const meta = {
  title: "atoms/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <View className="flex-row flex-wrap items-center">
      <Text className="font-mono text-xs text-muted">S2E3</Text>
      <Separator />
      <Text className="font-mono text-xs tabular-nums text-snow/80">12 November 2024</Text>
      <Separator />
      <Text className="font-mono text-xs tabular-nums text-snow/80">54m</Text>
    </View>
  ),
};
