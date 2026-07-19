import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders, withCountdownIn5Seconds } from "../../../../.storybook/decorators.tsx";
import { mockSeriesSummary, noop } from "../../../../.storybook/mocks.ts";
import { WatchNextRow } from "./WatchNextRow.tsx";

const meta = {
  title: "Molecules/WatchNextRow",
  component: WatchNextRow,
  decorators: [withAppProviders],
  args: {
    series: mockSeriesSummary,
    onQuickMark: noop,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof WatchNextRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FiveSecondsRemaining: Story = {
  decorators: [
    withCountdownIn5Seconds((fixture, args) => ({
      ...args,
      series: {
        ...(args.series as typeof mockSeriesSummary),
        title: "Rick and Morty",
        category: "up_to_date",
        nextUnwatched: {
          episodeId: 9009,
          s: 9,
          e: 9,
          title: "Episode 9",
          airDate: fixture.airDate,
          airStamp: fixture.airStamp,
          episodeType: "standard",
        },
      },
    })),
  ],
};

export const Marking: Story = { args: { marking: true } };
