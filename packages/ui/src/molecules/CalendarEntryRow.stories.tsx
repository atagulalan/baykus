import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { CalendarEntryRow } from "./CalendarEntryRow.tsx";

const entry = {
  episodeId: 1,
  itemId: 10,
  title: "Severance",
  posterUrl: null,
  s: 2,
  e: 5,
  episodeTitle: "Trojan's Horse",
  networkOrProvider: "Apple TV+",
};

const meta = {
  title: "molecules/CalendarEntryRow",
  component: CalendarEntryRow,
  decorators: [voidDecorator],
} satisfies Meta<typeof CalendarEntryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entry,
    watched: false,
  },
  render: function Render() {
    const [watched, setWatched] = useState(false);
    return (
      <CalendarEntryRow
        entry={entry}
        watched={watched}
        onPress={() => {}}
        onToggleWatched={() => setWatched((v) => !v)}
      />
    );
  },
};
