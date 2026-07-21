import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { NextUpCard } from "./NextUpCard.tsx";

const meta = {
  title: "molecules/NextUpCard",
  component: NextUpCard,
  decorators: [voidDecorator],
} satisfies Meta<typeof NextUpCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Next up",
    episode: {
      s: 3,
      e: 4,
      episodeTitle: "The Summer House",
      stillUrl: null,
      watched: false,
    },
  },
  render: function Render() {
    const [watched, setWatched] = useState(false);
    return (
      <NextUpCard
        title="Next up"
        episode={{
          s: 3,
          e: 4,
          episodeTitle: "The Summer House",
          stillUrl: null,
          watched,
        }}
        onToggleWatch={() => setWatched((v) => !v)}
      />
    );
  },
};
