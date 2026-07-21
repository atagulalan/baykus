import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { WatchNextRow, type WatchNextSeries } from "./WatchNextRow.tsx";

const series: WatchNextSeries = {
  id: 42,
  title: "The Bear",
  posterUrl: null,
  category: "watching",
  progress: { watched: 18, aired: 20, total: 28 },
  seasonProgress: {
    sequential: true,
    seasons: [{ number: 2, watched: 8, total: 10, announced: 10 }],
  },
  nextAirDate: null,
  nextUnwatched: {
    episodeId: 901,
    s: 2,
    e: 9,
    title: "Omelette",
    airDate: "2024-01-01",
    airStamp: "2024-01-01T20:00:00.000Z",
    stillUrl: null,
  },
};

const meta = {
  title: "molecules/WatchNextRow",
  component: WatchNextRow,
  decorators: [voidDecorator],
} satisfies Meta<typeof WatchNextRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithQuickMark: Story = {
  args: {
    series,
    onPress: () => {},
    onQuickMark: () => {},
    caughtUpSubtitle: "Up to date",
  },
  render: function Render() {
    const [marking, setMarking] = useState(false);
    return (
      <WatchNextRow
        series={series}
        marking={marking}
        caughtUpSubtitle="Up to date"
        onPress={() => {}}
        onQuickMark={() => {
          setMarking(true);
          setTimeout(() => setMarking(false), 600);
        }}
      />
    );
  },
};
