import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { mockSeriesDetail, noop } from "../../../../.storybook/mocks.ts";
import type { SeriesDetail } from "../../../api/types.ts";
import { SeriesDetailsSheet } from "./SeriesDetailsSheet.tsx";

const sparseDetail: SeriesDetail = {
  ...mockSeriesDetail,
  tagline: null,
  overview: null,
  genres: [],
  tags: [],
  cast: [],
  contentRatings: [],
  networks: [],
  watchProviders: [],
  externalRatings: [],
  note: null,
  seasons: [],
};

const meta = {
  title: "Organisms/SeriesDetailsSheet",
  component: SeriesDetailsSheet,
  args: {
    isOpen: true,
    onClose: noop,
    detail: mockSeriesDetail,
    activeRegion: "US",
    onRateChange: noop,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SeriesDetailsSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SparseMetadata: Story = {
  args: { detail: sparseDetail },
};

export const Closed: Story = {
  args: { isOpen: false },
};

export const Interactive: Story = {
  render: function InteractiveSheet(args) {
    const [open, setOpen] = useState(true);
    return (
      <div className="relative flex h-48 w-full items-start justify-end p-8">
        <button
          type="button"
          className="rounded border border-white/10 px-3 py-1 text-sm text-snow"
          onClick={() => setOpen(true)}
        >
          Open details
        </button>
        <SeriesDetailsSheet {...args} isOpen={open} onClose={() => setOpen(false)} />
      </div>
    );
  },
};

export const OpenByDefault: Story = {
  args: { isOpen: true },
};
