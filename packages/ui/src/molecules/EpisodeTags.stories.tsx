import type { Meta, StoryObj } from "@storybook/react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { EpisodeTags } from "./EpisodeTags.tsx";

const labels = {
  new: "NEW",
  upcoming: "UPCOMING",
  premiere: "PREMIERE",
  finale: "FINALE",
  special: "SPECIAL",
  ova: "OVA",
};

const meta = {
  title: "molecules/EpisodeTags",
  component: EpisodeTags,
  decorators: [voidDecorator],
} satisfies Meta<typeof EpisodeTags>;

export default meta;
type Story = StoryObj<typeof meta>;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export const NewAndFinale: Story = {
  args: {
    s: 1,
    e: 10,
    airDate: daysAgoIso(1),
    episodeType: "finale",
    labels,
  },
};

export const UpcomingPremiere: Story = {
  args: {
    s: 2,
    e: 1,
    airDate: (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 5);
      return d.toISOString().slice(0, 10);
    })(),
    episodeType: "standard",
    labels,
  },
};
