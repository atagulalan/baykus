import { defineWorkspace } from "vitest/config";

export default defineWorkspace(["./vitest.config.ts", "./apps/web/vitest.storybook.config.ts"]);
