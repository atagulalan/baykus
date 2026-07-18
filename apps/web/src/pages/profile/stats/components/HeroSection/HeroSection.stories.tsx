import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockEmptyStats, mockStats } from "../../../../../../.storybook/mocks.ts";
import { HeroSection } from "./HeroSection.tsx";

const meta = {
  title: "Stats/HeroSection",
  component: HeroSection,
  args: { stats: mockStats },
  parameters: { layout: "padded" },
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { stats: mockEmptyStats } };
