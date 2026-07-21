import type { Meta, StoryObj } from "@storybook/react";
import { Tv } from "lucide-react-native";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

const meta = {
  title: "molecules/SectionHeader",
  component: SectionHeader,
  decorators: [voidDecorator],
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsible: Story = {
  args: {
    label: "Watching",
    count: 4,
    icon: Tv,
  },
  render: function Render() {
    const [expanded, setExpanded] = useState(true);
    return (
      <SectionHeader
        icon={Tv}
        label="Watching"
        count={4}
        expanded={expanded}
        onPress={() => setExpanded((v) => !v)}
      />
    );
  },
};
