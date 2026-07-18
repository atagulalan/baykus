import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockBrokenImageUrl, mockPosterSvg } from "../../../../.storybook/mocks.ts";
import { MediaImage } from "./MediaImage.tsx";

const meta = {
  title: "Atoms/MediaImage",
  component: MediaImage,
  args: {
    src: mockPosterSvg,
    alt: "Poster",
    wrapperClassName: "block h-48 w-32",
    className: "h-full w-full object-cover",
  },
} satisfies Meta<typeof MediaImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LargeSpinner: Story = { args: { spinnerSize: 32 } };

/** Broken URL — component renders nothing after error (by design). */
export const ErrorHidden: Story = {
  args: { src: mockBrokenImageUrl },
  parameters: {
    docs: {
      description: {
        story: "On load error the component returns `null` — canvas may appear empty.",
      },
    },
  },
};

export const SlowLoad: Story = {
  args: {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect fill='%23181818' width='200' height='300'/%3E%3C/svg%3E",
    spinnerSize: 24,
  },
};
