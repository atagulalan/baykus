/**
 * Deterministic JSON serialization — every object key sorted recursively.
 * This is what makes `export → import(empty) → export` byte-identical
 * (Article III's round-trip invariant): the SAME logical data always
 * serializes to the SAME bytes, independent of DB row/column iteration order.
 * Array ELEMENT order is a caller concern (see zip/export.ts's sort-by-identity
 * helpers) — this only ever reorders object keys, never array elements.
 */
export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
