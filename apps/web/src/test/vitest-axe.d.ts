import type { AxeResults } from "vitest-axe";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T extends AxeResults ? void : never;
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
