import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatsSectionHeading } from "./StatsSectionHeading.tsx";

const meta = {
  title: "Stats/StatsSectionHeading",
  component: StatsSectionHeading,
  args: {
    children: "İzleme Durumu",
  },
} satisfies Meta<typeof StatsSectionHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
