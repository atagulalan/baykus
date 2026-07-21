import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { type LibrarySort, SortMenu } from "./SortMenu.tsx";

const options = [
  { value: "title" as const, label: "Title" },
  { value: "added" as const, label: "Date added" },
  { value: "lastWatched" as const, label: "Last watched" },
  { value: "rating" as const, label: "Rating" },
  { value: "nextAir" as const, label: "Next air" },
];

const meta = {
  title: "molecules/SortMenu",
  component: SortMenu,
  decorators: [voidDecorator],
} satisfies Meta<typeof SortMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sort: "title",
    onChange: () => {},
    options,
    title: "Sort",
    accessibilityLabel: "Sort library",
  },
  render: function Render() {
    const [sort, setSort] = useState<LibrarySort>("lastWatched");
    return (
      <SortMenu
        sort={sort}
        onChange={setSort}
        options={options}
        title="Sort"
        accessibilityLabel="Sort library"
      />
    );
  },
};
