import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppProviders } from "../../../../.storybook/decorators.tsx";
import { mockSearchResult } from "../../../../.storybook/mocks.ts";
import { SearchResultThumb } from "./SearchResultThumb.tsx";

const meta = {
  title: "Molecules/SearchResultThumb",
  component: SearchResultThumb,
  decorators: [withAppProviders],
  args: { result: mockSearchResult },
} satisfies Meta<typeof SearchResultThumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InLibrary: Story = {
  args: { result: { ...mockSearchResult, libraryItemId: 1 } },
};
