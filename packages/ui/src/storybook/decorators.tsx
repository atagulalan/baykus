import type { Decorator } from "@storybook/react";
import { View } from "react-native";

/** Dark brand canvas for RN-Web stories. */
export const voidDecorator: Decorator = (Story) => (
  <View className="min-h-[120px] bg-void p-6">
    <Story />
  </View>
);
