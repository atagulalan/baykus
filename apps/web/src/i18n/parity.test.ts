import { describe, expect, it } from "vitest";
import en from "./en.json";
import tr from "./tr.json";

function collectKeyPaths(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null) {
    return [prefix];
  }
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n catalog parity (M9.4)", () => {
  it("tr.json and en.json expose the exact same set of keys", () => {
    const trKeys = collectKeyPaths(tr).sort();
    const enKeys = collectKeyPaths(en).sort();

    expect(trKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !trKeys.includes(k))).toEqual([]);
    expect(trKeys).toEqual(enKeys);
  });
});
