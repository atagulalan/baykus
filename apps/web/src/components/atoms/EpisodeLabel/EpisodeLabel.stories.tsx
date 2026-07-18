import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { EpisodeLabel } from "./EpisodeLabel.tsx";

const meta = {
  title: "Atoms/EpisodeLabel",
  component: EpisodeLabel,
  decorators: [withAppProviders],
  args: { s: 3, e: 5, format: "SxEy" as const },
} satisfies Meta<typeof EpisodeLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Specials: Story = { args: { s: 0, e: 1 } };

export const ZeroPadded: Story = {
  args: { s: 1, e: 6, format: "S01E06" },
};

export const CompactFormat: Story = {
  args: { s: 12, e: 3, format: "compact" },
};
