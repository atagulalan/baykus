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

  it("adds imdb in single mode when scrapersEnabled and a dataDir are given", () => {
    const providers = createProviderRegistry({
      scrapersEnabled: true,
      dataDir: "/tmp/baykus-test",
      mode: "single",
    });
    expect(providers.map((p) => p.id)).toEqual(["tvmaze", "imdb"]);
  });

  it("never adds imdb in multi mode, even when scrapersEnabled — M8.3: bandwidth, not ToS", () => {
    const providers = createProviderRegistry({
      scrapersEnabled: true,
      dataDir: "/tmp/baykus-test",
      mode: "multi",
    });
    expect(providers.map((p) => p.id)).toEqual(["tvmaze"]);
  });

  it("omits imdb when scrapersEnabled is false", () => {
    const providers = createProviderRegistry({ dataDir: "/tmp/baykus-test", mode: "single" });
    expect(providers.map((p) => p.id)).toEqual(["tvmaze"]);
  });
});
