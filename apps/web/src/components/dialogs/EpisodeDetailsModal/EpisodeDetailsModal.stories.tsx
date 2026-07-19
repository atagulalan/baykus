import type { Meta, StoryObj } from "@storybook/react-vite";
import { withCountdownIn5Seconds, withQueryClient } from "../../../../.storybook/decorators.tsx";
import { mockLongOverview, mockStillSvg, noop } from "../../../../.storybook/mocks.ts";
import { EpisodeDetailsModal } from "./EpisodeDetailsModal.tsx";

const meta = {
  title: "Dialogs/EpisodeDetailsModal",
  component: EpisodeDetailsModal,
  decorators: [withQueryClient],
  args: {
    open: true,
    onClose: noop,
    s: 3,
    e: 5,
    episodeTitle: "Más",
    airDate: "2009-04-06",
    episodeType: "standard",
    overview: "Walter tries to gain control over his life.",
    runtimeMin: 47,
    watchCount: 0,
    stillRef: mockStillSvg,
    seriesTitle: "Breaking Bad",
    airStamp: null,
    watched: false,
    onToggleWatched: noop,
    onRate: noop,
  },
} satisfies Meta<typeof EpisodeDetailsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Watched: Story = {
  args: {
    watched: true,
    watchCount: 1,
    lastWatchedAt: "2026-07-15T20:00:00.000Z",
    myRating: 3,
  },
};

export const Closed: Story = { args: { open: false } };

/** Overview omitted while series detail fetch is pending. */
export const LoadingOverview: Story = {
  args: { overview: undefined },
};

export const NoOverview: Story = {
  args: { overview: null },
};

export const SpoilerProtected: Story = {
  args: {
    hideSpoilers: true,
    overview: mockLongOverview,
    episodeTitle: "The big reveal",
    watched: false,
  },
};

export const Unaired: Story = {
  args: {
    airDate: "2099-12-31",
    watched: false,
    overview: null,
  },
};

export const FiveSecondsRemaining: Story = {
  decorators: [withCountdownIn5Seconds()],
  args: {
    watched: false,
    overview: null,
    onToggleWatched: noop,
  },
};

export const WithoutStill: Story = {
  args: { stillRef: null },
};
