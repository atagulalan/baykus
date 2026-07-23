import { resources } from "@baykus/i18n";
import { describe, expect, it } from "vitest";

const catalogs = {
  tr: resources.tr.translation,
  en: resources.en.translation,
  ja: resources.ja.translation,
} as const;

function collectKeyPaths(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null) {
    return [prefix];
  }
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n catalog parity (M9.4)", () => {
  it("tr.json, en.json, and ja.json expose the exact same set of keys", () => {
    const trKeys = collectKeyPaths(catalogs.tr).sort();
    const enKeys = collectKeyPaths(catalogs.en).sort();
    const jaKeys = collectKeyPaths(catalogs.ja).sort();

    expect(trKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !trKeys.includes(k))).toEqual([]);
    expect(trKeys.filter((k) => !jaKeys.includes(k))).toEqual([]);
    expect(jaKeys.filter((k) => !trKeys.includes(k))).toEqual([]);
    expect(trKeys).toEqual(enKeys);
    expect(trKeys).toEqual(jaKeys);
  });
});
