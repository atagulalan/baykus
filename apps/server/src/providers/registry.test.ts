import { describe, expect, it } from "vitest";
import { createProviderRegistry } from "./registry.ts";

describe("createProviderRegistry", () => {
  it("registers tvmaze as the (currently only, keyless) provider", () => {
    const providers = createProviderRegistry();
    expect(providers.map((p) => p.id)).toEqual(["tvmaze"]);
    expect(providers[0]?.requiresApiKey).toBe(false);
  });
});
