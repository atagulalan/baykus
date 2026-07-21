import type { Meta, StoryObj } from "@storybook/react";
import { BrandSmoke } from "./BrandSmoke.tsx";

const meta = {
  title: "gallery/BrandSmoke",
  component: BrandSmoke,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof BrandSmoke>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    subtitle: "RN Web + NativeWind gallery",
  },
};
