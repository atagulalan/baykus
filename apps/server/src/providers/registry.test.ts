import { describe, expect, it } from "vitest";
import { createProviderRegistry } from "./registry.ts";

describe("createProviderRegistry", () => {
  it("registers tvmaze as the only provider when no TMDB key is configured (Article IV)", () => {
    const providers = createProviderRegistry();
    expect(providers.map((p) => p.id)).toEqual(["tvmaze"]);
    expect(providers[0]?.requiresApiKey).toBe(false);
  });

  it("puts tmdb first when a key is configured, tvmaze stays as fallback", () => {
    const providers = createProviderRegistry({ tmdbApiKey: "test-key" });
    expect(providers.map((p) => p.id)).toEqual(["tmdb", "tvmaze"]);
    expect(providers[0]?.requiresApiKey).toBe(true);
  });
});
