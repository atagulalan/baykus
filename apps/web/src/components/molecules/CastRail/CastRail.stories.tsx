import type { Meta, StoryObj } from "@storybook/react-vite";
import { CastRail } from "./CastRail.tsx";

const meta = {
  title: "Molecules/CastRail",
  component: CastRail,
  args: {
    cast: [
      { id: 1, name: "Bryan Cranston", character: "Walter White", order: 0 },
      { id: 2, name: "Aaron Paul", character: "Jesse Pinkman", order: 1 },
      { id: 3, name: "Anna Gunn", character: "Skyler White", order: 2 },
    ],
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof CastRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
