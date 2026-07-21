import { todayIso } from "./airing.ts";
import { getAbsoluteWeek, getIsoWeek, getWeekStartIso, mondayFirstDow } from "./weeks.ts";

export type ScheduleGridEpisode = {
  episodeId: number;
  itemId: number;
  title: string;
  posterRef: string | null;
  s: number;
  e: number;
  episodeTitle: string | null;
  airDate: string;
  airStamp: string | null;
  isWatched: boolean;
};

export type ScheduleGridDayInput = {
  date: string;
  entries: ScheduleGridEpisode[];
};

export type ScheduleWeekColumn =
  | {
      type: "week";
      absWeek: number;
      label: string;
      isCurrent: boolean;
      /** Monday-first: 7 slots of episodes that air that weekday in this week. */
      byDow: ScheduleGridEpisode[][];
    }
  | { type: "gap"; startAbsWeek: number; endAbsWeek: number };

export type ScheduleGridModel = {
  columns: ScheduleWeekColumn[];
  weekdayLabels: string[];
  currentAbsWeek: number;
};

const GAP_THRESHOLD = 4;

function weekdayLabels(locale: string): string[] {
  const monday = new Date(Date.UTC(2024, 0, 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  });
}

function weekLabel(absWeek: number, currentIsoYear: number, locale: string): string {
  const iso = getIsoWeek(getWeekStartIso(absWeek));
  if (iso.year === currentIsoYear) {
    return locale.startsWith("tr") ? `${iso.week}. Hafta` : `W${iso.week}`;
  }
  return locale.startsWith("tr") ? `${iso.year} - ${iso.week}. Hafta` : `${iso.year} W${iso.week}`;
}

/**
 * Build week×weekday schedule columns from calendar days.
 * Omits fully-watched strips (episodes only kept when the strip has ≥1 unwatched).
 * Compresses 4+ inactive weeks into a gap column (web ScheduleGrid semantics).
 */
export function buildScheduleGridModel(
  days: ScheduleGridDayInput[],
  opts?: { locale?: string; today?: string },
): ScheduleGridModel {
  const locale = opts?.locale ?? "tr-TR";
  const today = opts?.today ?? todayIso();
  const currentAbsWeek = getAbsoluteWeek(today);
  const currentIsoYear = getIsoWeek(today).year;
  const labels = weekdayLabels(locale);

  let minAbsWeek = currentAbsWeek - 2;
  let maxAbsWeek = currentAbsWeek + 2;
  for (const day of days) {
    const w = getAbsoluteWeek(day.date);
    if (w < minAbsWeek) minAbsWeek = w;
    if (w > maxAbsWeek) maxAbsWeek = w;
  }
  if (currentAbsWeek < minAbsWeek) minAbsWeek = currentAbsWeek;
  if (currentAbsWeek > maxAbsWeek) maxAbsWeek = currentAbsWeek;

  // Collect unwatched-relevant episodes by absWeek × dow
  type CellKey = string;
  const cells = new Map<CellKey, ScheduleGridEpisode[]>();
  const activeWeeks = new Set<number>([currentAbsWeek]);

  for (const day of days) {
    const absWeek = getAbsoluteWeek(day.date);
    const dow = mondayFirstDow(day.date);
    // Group by dow+item+season to decide fully-watched strips
    const byStrip = new Map<string, ScheduleGridEpisode[]>();
    for (const entry of day.entries) {
      const key = `${dow}-${entry.itemId}-S${entry.s}`;
      const list = byStrip.get(key) ?? [];
      list.push(entry);
      byStrip.set(key, list);
    }
    for (const eps of byStrip.values()) {
      if (eps.every((e) => e.isWatched)) continue;
      activeWeeks.add(absWeek);
      const cellKey = `${absWeek}:${dow}`;
      const existing = cells.get(cellKey) ?? [];
      existing.push(...eps);
      cells.set(cellKey, existing);
    }
  }

  type RawCol =
    | { type: "week"; absWeek: number }
    | { type: "gap"; startAbsWeek: number; endAbsWeek: number };
  const raw: RawCol[] = [];
  let w = minAbsWeek;
  while (w <= maxAbsWeek) {
    if (activeWeeks.has(w)) {
      raw.push({ type: "week", absWeek: w });
      w++;
    } else {
      let nextActive = w + 1;
      while (nextActive <= maxAbsWeek && !activeWeeks.has(nextActive)) nextActive++;
      const gapLength = nextActive - w;
      if (gapLength >= GAP_THRESHOLD) {
        raw.push({ type: "gap", startAbsWeek: w, endAbsWeek: nextActive - 1 });
      } else {
        for (let g = w; g < nextActive; g++) raw.push({ type: "week", absWeek: g });
      }
      w = nextActive;
    }
  }

  const columns: ScheduleWeekColumn[] = raw.map((col) => {
    if (col.type === "gap") return col;
    const byDow: ScheduleGridEpisode[][] = Array.from({ length: 7 }, () => []);
    for (let dow = 0; dow < 7; dow++) {
      const list = cells.get(`${col.absWeek}:${dow}`) ?? [];
      byDow[dow] = list.sort((a, b) => {
        const ta = a.airStamp ?? `${a.airDate}T00:00:00Z`;
        const tb = b.airStamp ?? `${b.airDate}T00:00:00Z`;
        return ta.localeCompare(tb);
      });
    }
    return {
      type: "week",
      absWeek: col.absWeek,
      label: weekLabel(col.absWeek, currentIsoYear, locale),
      isCurrent: col.absWeek === currentAbsWeek,
      byDow,
    };
  });

  return { columns, weekdayLabels: labels, currentAbsWeek };
}
