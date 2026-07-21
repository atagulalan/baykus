import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { voidDecorator } from "../storybook/decorators.tsx";
import { SegmentedButtonGroup } from "./SegmentedButtonGroup.tsx";

type Mode = "timeline" | "month" | "schedule";

const meta = {
  title: "atoms/SegmentedButtonGroup",
  component: SegmentedButtonGroup,
  decorators: [voidDecorator],
} satisfies Meta<typeof SegmentedButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CalendarModes: Story = {
  // Meta typing loses generics; render owns the typed props.
  args: {
    options: [],
    value: "timeline",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState<Mode>("timeline");
    return (
      <SegmentedButtonGroup
        value={value}
        onChange={setValue}
        options={[
          { value: "timeline", label: "Timeline" },
          { value: "month", label: "Month" },
          { value: "schedule", label: "Schedule" },
        ]}
      />
    );
  },
};
