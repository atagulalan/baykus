import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { SeriesCard, type SeriesCardSeries } from "./SeriesCard.tsx";

const sample: SeriesCardSeries = {
  id: 1,
  title: "Succession",
  year: 2018,
  posterUrl: null,
  category: "watching",
  rating: 3,
  progress: { watched: 12, aired: 20 },
  seasonProgress: {
    sequential: true,
    seasons: [
      { number: 1, watched: 10, total: 10, announced: 10 },
      { number: 2, watched: 2, total: 10, announced: 10 },
    ],
  },
};

const meta = {
  title: "molecules/SeriesCard",
  component: SeriesCard,
  decorators: [voidDecorator],
} satisfies Meta<typeof SeriesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    series: sample,
    onPress: () => {},
  },
  render: () => (
    <View className="w-36">
      <SeriesCard series={sample} onPress={() => {}} />
    </View>
  ),
};
