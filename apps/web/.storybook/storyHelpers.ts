import type { Meta } from "@storybook/react-vite";
import { withAppProviders } from "./decorators.tsx";

/** Shared meta for mutation/router-heavy components in padded layout. */
export const appProvidersMeta = {
  decorators: [withAppProviders],
  parameters: { layout: "padded" as const },
} satisfies Partial<Meta>;

/** Document sections that intentionally render nothing for empty stats fixtures. */
export const hiddenWhenEmptyParameters = {
  docs: {
    description: {
      story:
        "Uses `mockEmptyStats` — this section returns `null` when its slice is empty (hidden on `/stats`, not an empty-state UI).",
    },
  },
} as const;
