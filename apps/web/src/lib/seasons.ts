/** E37: numeric seasons ascending, Specials (season 0) last. Presentation-only — core/zip season ordering untouched. */
export function sortSeasonsSpecialsLast<T extends { number: number }>(seasons: T[]): T[] {
  return [...seasons].sort((a, b) => {
    if (a.number === 0) return 1;
    if (b.number === 0) return -1;
    return a.number - b.number;
  });
}
