import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockSeason, noop } from "../../../../.storybook/mocks.ts";
import type { SeasonSummary } from "../../../api/types.ts";
import { SeasonSection } from "./SeasonSection.tsx";

const completeSeason: SeasonSummary = {
  ...mockSeason,
  episodes: mockSeason.episodes.map((ep) => ({
    ...ep,
    myRating: 3,
    watchCount: 1,
    lastWatchedAt: "2026-01-10T20:00:00.000Z",
  })),
};

const specialsSeason: SeasonSummary = {
  number: 0,
  name: "Specials",
  overview: null,
  posterRef: null,
  airDate: null,
  episodes: [
    {
      id: 900,
      s: 0,
      e: 1,
      title: "Behind the Scenes",
      overview: null,
      airDate: "2010-01-01",
      airStamp: null,
      runtimeMin: 30,
      stillRef: null,
      episodeType: "standard",
      communityRating: null,
      myRating: null,
      watchCount: 0,
      lastWatchedAt: null,
    },
  ],
};

const meta = {
  title: "Organisms/SeasonSection",
  component: SeasonSection,
  decorators: [withAppProviders],
  args: {
    season: mockSeason,
    nextUnwatched: { s: 1, e: 2 },
    expanded: true,
    onToggleExpanded: noop,
    onToggleWatch: noop,
    onWatchAgain: noop,
    onEditDate: noop,
    onBulkUpToHere: noop,
    onMarkSeasonWatched: noop,
    onUnwatchSeason: noop,
    promptEpisodeId: null,
    onRateEpisode: noop,
    onDismissPrompt: noop,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof SeasonSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRatingPrompt: Story = {
  args: { promptEpisodeId: 1 },
};

/** Season does not contain the next unwatched episode — starts collapsed. */
export const Collapsed: Story = {
  args: {
    expanded: false,
    nextUnwatched: { s: 5, e: 1 },
  },
};

export const Complete: Story = {
  args: {
    expanded: false,
    season: completeSeason,
    nextUnwatched: { s: 2, e: 1 },
  },
};

export const Specials: Story = {
  args: {
    season: specialsSeason,
    nextUnwatched: { s: 1, e: 2 },
  },
};

/** Confirmed season with no episodes yet — TBD empty panel (E184). */
export const EmptyAnnounced: Story = {
  args: {
    season: {
      number: 3,
      name: null,
      overview: null,
      posterRef: null,
      airDate: null,
      episodes: [],
    },
    nextUnwatched: null,
    expanded: true,
  },
};
