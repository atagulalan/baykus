import type { Meta, StoryObj } from "@storybook/react-vite";
import { EpisodeTags } from "./EpisodeTags.tsx";

const meta = {
  title: "Molecules/EpisodeTags",
  component: EpisodeTags,
  args: {
    s: 5,
    e: 16,
    airDate: "2013-09-29",
    episodeType: "finale",
    seasonName: "Season 5",
  },
} satisfies Meta<typeof EpisodeTags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finale: Story = {};

export const Premiere: Story = {
  args: { s: 1, e: 1, episodeType: "standard", airDate: "2008-01-20" },
};

export const Upcoming: Story = {
  args: { airDate: "2099-12-31", episodeType: "standard" },
};

export const New: Story = {
  args: { s: 2, e: 4, airDate: "2026-07-17", episodeType: "standard" },
  parameters: {
    docs: {
      description: { story: "NEW tag when aired within the last 3 days (relative to today)." },
    },
  },
};

export const Special: Story = {
  args: {
    s: 0,
    e: 2,
    episodeTitle: "Behind the Scenes",
    episodeType: "standard",
    airDate: "2010-01-01",
  },
};

export const Ova: Story = {
  args: {
    s: 0,
    e: 1,
    episodeTitle: "OVA: Recap",
    seasonName: "Extras",
    airDate: "2011-01-01",
  },
};

export const Stacked: Story = {
  args: {
    s: 0,
    e: 1,
    airDate: "2026-07-18",
    episodeType: "finale",
    episodeTitle: "Series Finale Special",
  },
};
