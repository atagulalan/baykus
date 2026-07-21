import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { SkeletonBone, SkeletonPill } from "./Skeleton.tsx";

const meta = {
  title: "atoms/Skeleton",
  component: SkeletonBone,
  decorators: [voidDecorator],
} satisfies Meta<typeof SkeletonBone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BoneAndPill: Story = {
  render: () => (
    <View className="w-full max-w-xs gap-3">
      <SkeletonBone className="h-4 w-full rounded" />
      <SkeletonBone className="h-24 w-full rounded-lg" />
      <SkeletonPill />
    </View>
  ),
};
