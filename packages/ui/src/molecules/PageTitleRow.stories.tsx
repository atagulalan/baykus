import type { Meta, StoryObj } from "@storybook/react";
import { Pressable, Text } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { PageTitleRow } from "./PageTitleRow.tsx";

const meta = {
  title: "molecules/PageTitleRow",
  component: PageTitleRow,
  decorators: [voidDecorator],
} satisfies Meta<typeof PageTitleRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = {
  args: {
    children: "Library",
    action: (
      <Pressable
        accessibilityRole="button"
        className="rounded-full border border-white/15 px-3 py-1.5"
      >
        <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">Sort</Text>
      </Pressable>
    ),
  },
};
