import type { Meta, StoryObj } from "@storybook/react";
import { ScrollView, View } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import {
  SkeletonBone,
  SkeletonCalendarTimeline,
  SkeletonCategoryGrid,
  SkeletonPill,
  SkeletonProfilePage,
  SkeletonSearchResults,
  SkeletonSectionHeader,
  SkeletonSeriesDetailHero,
  SkeletonSettingsSections,
  SkeletonStatsPage,
  SkeletonWatchLists,
} from "./Skeleton.tsx";

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
      <SkeletonSectionHeader />
    </View>
  ),
};

export const CategoryGrid: Story = {
  render: () => (
    <ScrollView className="w-full">
      <SkeletonCategoryGrid sections={2} cols={3} />
    </ScrollView>
  ),
};

export const WatchLists: Story = {
  render: () => (
    <ScrollView className="w-full">
      <SkeletonWatchLists />
    </ScrollView>
  ),
};

export const CalendarTimeline: Story = {
  render: () => (
    <ScrollView className="w-full">
      <SkeletonCalendarTimeline />
    </ScrollView>
  ),
};

export const ProfilePage: Story = {
  render: () => (
    <ScrollView className="w-full">
      <SkeletonProfilePage bannerHeight={280} cols={3} />
    </ScrollView>
  ),
};

export const StatsPage: Story = {
  render: () => (
    <ScrollView className="w-full max-w-lg">
      <SkeletonStatsPage contentWidth={360} />
    </ScrollView>
  ),
};

export const SeriesDetailHero: Story = {
  render: () => (
    <ScrollView className="w-full">
      <SkeletonSeriesDetailHero insetsTop={48} />
    </ScrollView>
  ),
};

export const SettingsSections: Story = {
  render: () => (
    <ScrollView className="w-full max-w-lg">
      <SkeletonSettingsSections sections={3} />
    </ScrollView>
  ),
};

export const SearchResults: Story = {
  render: () => (
    <View className="w-full max-w-md">
      <SkeletonSearchResults rows={4} />
    </View>
  ),
};
