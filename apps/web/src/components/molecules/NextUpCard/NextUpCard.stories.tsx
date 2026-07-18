import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockEpisode, mockSeriesSummary, noop } from "../../../../.storybook/mocks.ts";
import { NextUpCard } from "./NextUpCard.tsx";

const nextEpisode = mockSeriesSummary.nextUnwatched ?? {
  episodeId: 43,
  s: 3,
  e: 5,
  title: "Más",
  airDate: "2009-04-06",
  episodeType: "standard" as const,
};

const meta = {
  title: "Molecules/NextUpCard",
  component: NextUpCard,
  decorators: [withAppProviders],
  args: {
    episode: mockEpisode,
    nextEpisode,
    promptEpisodeId: null,
    onToggleWatch: noop,
    onWatchAgain: noop,
    onEditDate: noop,
    onBulkUpToHere: noop,
    onRateEpisode: noop,
    onDismissPrompt: noop,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof NextUpCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRatingPrompt: Story = {
  args: { promptEpisodeId: mockEpisode.id },
};

export const Watched: Story = {
  args: {
    episode: {
      ...mockEpisode,
      watchCount: 1,
      myRating: 3,
      lastWatchedAt: "2026-07-15T20:00:00.000Z",
    },
  },
};

export const Unaired: Story = {
  args: {
    episode: {
      ...mockEpisode,
      airDate: "2099-01-01",
      watchCount: 0,
    },
  },
};
