import type { Meta, StoryObj } from "@storybook/react";
import { Library } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { EMPTY_PANEL_CTA_CLASS, EmptyPanel } from "./EmptyPanel.tsx";

const meta = {
  title: "molecules/EmptyPanel",
  component: EmptyPanel,
  decorators: [voidDecorator],
} satisfies Meta<typeof EmptyPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Library,
    title: "Nothing here",
    hint: "Add a series from search to get started.",
  },
};

export const WithAction: Story = {
  args: {
    icon: Library,
    title: "Library empty",
    hint: "Start watching something.",
    action: (
      <Pressable accessibilityRole="button" className={EMPTY_PANEL_CTA_CLASS}>
        <Text className="font-mono text-[10px] uppercase tracking-widest text-void">Search</Text>
      </Pressable>
    ),
  },
};
