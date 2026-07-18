import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { noop } from "../../../../.storybook/mocks.ts";
import { SortMenu } from "./SortMenu.tsx";

const meta = {
  title: "Molecules/SortMenu",
  component: SortMenu,
  args: {
    sort: "lastWatched",
    onChange: noop,
    idSuffix: "story",
  },
} satisfies Meta<typeof SortMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TitleSort: Story = {
  args: { sort: "title" },
};

export const LimitedOptions: Story = {
  args: {
    sort: "added",
    options: ["added", "title"],
  },
};

export const Open: Story = {
  render: function OpenSortMenu(args) {
    const rootRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
      rootRef.current?.querySelector("button")?.click();
    }, []);
    return (
      <span ref={rootRef} className="inline-flex p-8">
        <SortMenu {...args} />
      </span>
    );
  },
};
