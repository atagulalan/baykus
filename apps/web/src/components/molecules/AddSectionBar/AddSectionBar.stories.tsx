import type { Meta, StoryObj } from "@storybook/react-vite";
import { noop } from "../../../../.storybook/mocks.ts";
import { AddSectionBar } from "./AddSectionBar.tsx";

const meta = {
  title: "Molecules/AddSectionBar",
  component: AddSectionBar,
  args: {
    mode: "manage",
    sections: ["watching", "not_watched_recently", "up_to_date"],
    sectionSorts: { watching: "lastWatched", up_to_date: "nextAir" },
    onSectionsChange: noop,
    onSortChange: noop,
  },
} satisfies Meta<typeof AddSectionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllPresent: Story = {
  args: {
    sections: [
      "watching",
      "not_watched_recently",
      "not_started",
      "watch_later",
      "up_to_date",
      "finished",
      "stopped",
    ],
  },
};

export const SortOnly: Story = {
  args: {
    mode: "sortOnly",
    sections: [
      "needs_review",
      "watching",
      "not_watched_recently",
      "not_started",
      "watch_later",
      "up_to_date",
      "finished",
      "stopped",
    ],
  },
};
