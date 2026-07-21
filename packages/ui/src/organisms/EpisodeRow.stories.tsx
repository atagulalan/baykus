import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { EpisodeRow } from "./EpisodeRow.tsx";

const tagLabels = {
  new: "NEW",
  upcoming: "UPCOMING",
  premiere: "PREMIERE",
  finale: "FINALE",
  special: "SPECIAL",
  ova: "OVA",
};

const meta = {
  title: "organisms/EpisodeRow",
  component: EpisodeRow,
  decorators: [voidDecorator],
} satisfies Meta<typeof EpisodeRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = {
  args: {
    s: 1,
    e: 3,
    episodeTitle: "Pilot",
    watched: false,
  },
  render: function Render() {
    const [watched, setWatched] = useState(false);
    return (
      <EpisodeRow
        s={1}
        e={3}
        episodeTitle="Pilot"
        stillUrl={null}
        watched={watched}
        onToggleWatch={() => setWatched((v) => !v)}
        tags={{
          airDate: new Date().toISOString().slice(0, 10),
          episodeType: "standard",
          labels: tagLabels,
        }}
        onPress={() => {}}
      />
    );
  },
};
