import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { voidDecorator } from "../storybook/decorators.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";

const meta = {
  title: "molecules/ConfirmDialog",
  component: ConfirmDialog,
  decorators: [voidDecorator],
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {
  args: {
    title: "Remove series?",
    body: "This removes the series from your library. Watches stay in history.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    onConfirm: () => {},
    onClose: () => {},
    variant: "danger",
  },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <View className="gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          className="self-start rounded-full border border-white/15 px-4 py-2"
        >
          <Text className="font-mono text-xs text-snow">Open dialog</Text>
        </Pressable>
        {open ? (
          <ConfirmDialog
            title="Remove series?"
            body="This removes the series from your library. Watches stay in history."
            confirmLabel="Remove"
            cancelLabel="Cancel"
            variant="danger"
            onConfirm={() => setOpen(false)}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </View>
    );
  },
};
