import type { Meta, StoryObj } from "@storybook/react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { SectionPill } from "./SectionPill.tsx";

const meta = {
  title: "atoms/SectionPill",
  component: SectionPill,
  decorators: [voidDecorator],
} satisfies Meta<typeof SectionPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "İzleniyor" },
};

export const Pressable: Story = {
  args: {
    children: "Tap me",
    onPress: () => {},
  },
};
