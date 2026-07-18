import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { noop } from "../../../../.storybook/mocks.ts";
import { SeriesActionsMenu } from "./SeriesActionsMenu.tsx";

const meta = {
  title: "Organisms/SeriesActionsMenu",
  component: SeriesActionsMenu,
  args: {
    favorite: true,
    manualList: null,
    category: "watching",
    pushMuted: false,
    onToggleFavorite: noop,
    onChangeManualList: noop,
    onToggleMute: noop,
    onRemove: noop,
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof SeriesActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WatchLater: Story = {
  args: { manualList: "watch_later", category: "watch_later" },
};

export const Muted: Story = { args: { pushMuted: true } };

export const NotFavorite: Story = { args: { favorite: false } };

export const Open: Story = {
  render: function OpenMenu(args) {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      rootRef.current?.querySelector("button")?.click();
    }, []);
    return (
      <div ref={rootRef} className="p-8">
        <SeriesActionsMenu {...args} />
      </div>
    );
  },
};
