import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import {
  mockBrokenImageUrl,
  mockLongOverview,
  mockLongTitle,
  noop,
} from "../../../../.storybook/mocks.ts";
import { EpisodeRow } from "./EpisodeRow.tsx";

const meta = {
  title: "Organisms/EpisodeRow",
  component: EpisodeRow,
  decorators: [withAppProviders],
  args: {
    s: 3,
    e: 5,
    episodeTitle: "Más",
    airDate: "2009-04-06",
    episodeType: "standard",
    runtimeMin: 47,
    onToggleWatch: noop,
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof EpisodeRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSeriesChrome: Story = {
  args: {
    itemId: 1,
    seriesTitle: "Breaking Bad",
    posterRef: null,
    detailsEpisodeId: 43,
  },
};

export const Watched: Story = {
  args: {
    watched: true,
    watchCount: 2,
    myRating: 3,
    onWatchAgain: noop,
    onEditDate: noop,
  },
};

export const Compact: Story = {
  args: { density: "compact" },
};

export const Unaired: Story = {
  args: { airDate: "2099-01-01", watched: false },
};

export const Centered: Story = {
  args: {
    align: "center",
    itemId: 1,
    seriesTitle: "Breaking Bad",
    hideCheckbox: true,
  },
};

export const Rewatch: Story = {
  args: {
    watched: true,
    watchCount: 3,
    onWatchAgain: noop,
    onEditDate: noop,
    onToggleWatch: noop,
  },
};

export const Overflow: Story = {
  args: {
    itemId: 1,
    seriesTitle: mockLongTitle,
    overflow: 4,
    episodeTitle: mockLongTitle,
  },
};

export const RatingPrompt: Story = {
  args: {
    watched: true,
    watchCount: 1,
    showRatingPrompt: true,
    myRating: null,
    onRate: noop,
    onDismissPrompt: noop,
    onToggleWatch: noop,
  },
};

export const SpoilerProtected: Story = {
  parameters: {
    querySettings: {
      spoilerProtection: true,
    },
  },
  args: {
    episodeTitle: "Major plot twist revealed",
    watched: false,
    overview: mockLongOverview,
  },
};

export const BrokenPoster: Story = {
  args: {
    itemId: 1,
    seriesTitle: "Breaking Bad",
    posterRef: mockBrokenImageUrl,
  },
};

/** Click the checkbox to open the bulk mark-up-to-here modal. */
export const BulkMarkModal: Story = {
  render: function BulkMarkModalStory(args) {
    const [watched, setWatched] = useState(false);
    return (
      <EpisodeRow
        {...args}
        watched={watched}
        hasUnwatchedBefore
        onBulkUpToHere={() => setWatched(true)}
        onToggleWatch={() => setWatched(true)}
      />
    );
  },
};

/** Click the rewatch badge to open watched-options modal. */
export const WatchedOptionsModal: Story = {
  args: {
    watched: true,
    watchCount: 2,
    onWatchAgain: noop,
    onEditDate: noop,
    onToggleWatch: noop,
  },
};
