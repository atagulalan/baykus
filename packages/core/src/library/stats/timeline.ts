import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import type { LibraryDatabase } from "../../db/open.ts";
import * as schema from "../../db/schema.ts";
import { ACTIVE_TRIO, computeCategories } from "../category.ts";
import { createLocalResolver } from "./buckets.ts";

export interface Timeline {
  recent: {
    last7Days: { episodes: number; watchTimeMin: number };
    last30Days: { episodes: number; watchTimeMin: number };
    thisMonth: { episodes: number; watchTimeMin: number };
  };
  pace: { episodesPerWeek: number; projectedWeeks: number } | null;
  upcoming: { months: { month: string; episodes: number; watchTimeMin: number }[] };
  binges: { itemId: number; title: string; date: string; episodes: number }[];
  streaks: {
    longestWeeks: number;
    currentWeeks: number;
    bySeries: { itemId: number; title: string; weeks: number }[];
  };
  timeByYear: {
    year: number;
    totalMin: number;
    monthlyMin: number[];
    weeklyMin: { week: number; min: number }[];
  }[];
  activityByDay: { date: string; count: number }[];
  byWeekday: number[];
  byHour: number[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PACE_WINDOW_DAYS = 56;
const PACE_WINDOW_WEEKS = PACE_WINDOW_DAYS / 7;

function episodeRuntimeMin(row: {
  runtimeMin: number | null;
  itemRunTimes: number[] | null;
}): number {
  if (row.runtimeMin != null) return row.runtimeMin;
  const times = row.itemRunTimes ?? [];
  return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
}

/** Longest run of consecutive weeks (weekStartMs values 7 days apart) in an unsorted set. */
function longestConsecutiveRun(weekStarts: ReadonlySet<number>): number {
  if (weekStarts.size === 0) return 0;
  const sorted = [...weekStarts].sort((a, b) => a - b);
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev === undefined || curr === undefined) continue;
    if (curr - prev === 7 * MS_PER_DAY) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

/** E104: counts backward from "now"'s ISO week, surviving one grace week if it's empty but the previous week isn't. */
function currentStreakWeeks(weekStarts: ReadonlySet<number>, nowWeekStartMs: number): number {
  const prevWeekStartMs = nowWeekStartMs - 7 * MS_PER_DAY;
  let anchor: number | null = null;
  if (weekStarts.has(nowWeekStartMs)) anchor = nowWeekStartMs;
  else if (weekStarts.has(prevWeekStartMs)) anchor = prevWeekStartMs;
  if (anchor === null) return 0;

  let count = 0;
  let cursor = anchor;
  while (weekStarts.has(cursor)) {
    count++;
    cursor -= 7 * MS_PER_DAY;
  }
  return count;
}

function addMonths(yyyymm: string, n: number): string {
  const [yearStr, monthStr] = yyyymm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const total = year * 12 + (month - 1) + n;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return `${nextYear}-${nextMonth < 10 ? "0" : ""}${nextMonth}`;
}

function computeUpcoming(
  db: LibraryDatabase,
  tz: string,
  itemIds: number[],
  now: Date,
): Timeline["upcoming"] {
  const categories = computeCategories(db, itemIds, now);
  const trioItemIds = itemIds.filter((id) => {
    const category = categories.get(id);
    return category !== undefined && ACTIVE_TRIO.has(category);
  });

  const resolve = createLocalResolver(tz);
  const todayLocal = resolve(now.toISOString()).dateStr;
  const currentMonth = todayLocal.slice(0, 7);
  const nextMonth = addMonths(currentMonth, 1);

  const perMonth = new Map<string, { episodes: number; watchTimeMin: number }>();
  perMonth.set(currentMonth, { episodes: 0, watchTimeMin: 0 });
  perMonth.set(nextMonth, { episodes: 0, watchTimeMin: 0 });

  if (trioItemIds.length > 0) {
    const rows = db
      .select({
        airDate: schema.episodes.airDate,
        runtimeMin: schema.episodes.runtimeMin,
        itemRunTimes: schema.items.episodeRunTimes,
      })
      .from(schema.episodes)
      .innerJoin(schema.items, eq(schema.items.id, schema.episodes.itemId))
      .leftJoin(schema.watches, eq(schema.watches.episodeId, schema.episodes.id))
      .where(
        and(
          inArray(schema.episodes.itemId, trioItemIds),
          ne(schema.episodes.seasonNumber, 0),
          isNotNull(schema.episodes.airDate),
          sql`${schema.episodes.airDate} >= ${todayLocal}`,
          sql`${schema.watches.id} is null`,
        ),
      )
      .all();

    for (const row of rows) {
      const month = (row.airDate ?? "").slice(0, 7);
      if (!month) continue;
      const entry = perMonth.get(month) ?? { episodes: 0, watchTimeMin: 0 };
      entry.episodes++;
      entry.watchTimeMin += episodeRuntimeMin(row);
      perMonth.set(month, entry);
    }
  }

  const maxMonth = [...perMonth.keys()].sort().at(-1) ?? nextMonth;
  const months: Timeline["upcoming"]["months"] = [];
  let cursor = currentMonth;
  while (cursor <= maxMonth) {
    const entry = perMonth.get(cursor) ?? { episodes: 0, watchTimeMin: 0 };
    months.push({
      month: cursor,
      episodes: entry.episodes,
      watchTimeMin: Math.round(entry.watchTimeMin),
    });
    cursor = addMonths(cursor, 1);
  }

  return { months };
}

export function computeTimeline(
  db: LibraryDatabase,
  tz: string,
  backlogEpisodes: number,
  now: Date = new Date(),
): Timeline {
  const allItemIds = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .all()
    .map((r) => r.id);

  const resolve = createLocalResolver(tz);
  const nowMoment = resolve(now.toISOString());
  const last7StartMs = now.getTime() - 7 * MS_PER_DAY;
  const last30StartMs = now.getTime() - 30 * MS_PER_DAY;
  const paceStartMs = now.getTime() - PACE_WINDOW_DAYS * MS_PER_DAY;

  const rows = db
    .select({
      itemId: schema.watches.itemId,
      title: schema.items.title,
      episodeId: schema.watches.episodeId,
      watchedAt: schema.watches.watchedAt,
      runtimeMin: schema.episodes.runtimeMin,
      itemRunTimes: schema.items.episodeRunTimes,
    })
    .from(schema.watches)
    .innerJoin(schema.episodes, eq(schema.watches.episodeId, schema.episodes.id))
    .innerJoin(schema.items, eq(schema.episodes.itemId, schema.items.id))
    .where(eq(schema.watches.dateUnknown, false))
    .all();

  let last7Episodes = 0;
  let last7Min = 0;
  let last30Episodes = 0;
  let last30Min = 0;
  let thisMonthEpisodes = 0;
  let thisMonthMin = 0;
  let paceWindowCount = 0;

  const bingeGroups = new Map<
    string,
    { itemId: number; title: string; date: string; episodes: Set<number> }
  >();
  const overallWeeks = new Set<number>();
  const weeksByItem = new Map<number, { title: string; weeks: Set<number> }>();
  const monthlyMinByYear = new Map<number, number[]>();
  const weeklyMinByIsoYear = new Map<number, Map<number, number>>();
  const activityByDayCount = new Map<string, number>();
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const byHour = new Array(24).fill(0) as number[];

  for (const row of rows) {
    const min = episodeRuntimeMin(row);
    const watchedAtMs = Date.parse(row.watchedAt);
    const moment = resolve(row.watchedAt);

    if (watchedAtMs >= last7StartMs) {
      last7Episodes++;
      last7Min += min;
    }
    if (watchedAtMs >= last30StartMs) {
      last30Episodes++;
      last30Min += min;
    }
    if (moment.year === nowMoment.year && moment.month === nowMoment.month) {
      thisMonthEpisodes++;
      thisMonthMin += min;
    }
    if (watchedAtMs >= paceStartMs) paceWindowCount++;

    const bingeKey = `${row.itemId}|${moment.dateStr}`;
    const bingeGroup = bingeGroups.get(bingeKey) ?? {
      itemId: row.itemId,
      title: row.title,
      date: moment.dateStr,
      episodes: new Set<number>(),
    };
    bingeGroup.episodes.add(row.episodeId);
    bingeGroups.set(bingeKey, bingeGroup);

    overallWeeks.add(moment.weekStartMs);
    const itemWeeks = weeksByItem.get(row.itemId) ?? { title: row.title, weeks: new Set<number>() };
    itemWeeks.weeks.add(moment.weekStartMs);
    weeksByItem.set(row.itemId, itemWeeks);

    const monthly = monthlyMinByYear.get(moment.year) ?? new Array(12).fill(0);
    monthly[moment.month - 1] += min;
    monthlyMinByYear.set(moment.year, monthly);

    const isoYearWeeks = weeklyMinByIsoYear.get(moment.isoYear) ?? new Map<number, number>();
    isoYearWeeks.set(moment.isoWeek, (isoYearWeeks.get(moment.isoWeek) ?? 0) + min);
    weeklyMinByIsoYear.set(moment.isoYear, isoYearWeeks);

    activityByDayCount.set(moment.dateStr, (activityByDayCount.get(moment.dateStr) ?? 0) + 1);
    byWeekday[moment.weekdayMonFirst] = (byWeekday[moment.weekdayMonFirst] ?? 0) + 1;
    byHour[moment.hour] = (byHour[moment.hour] ?? 0) + 1;
  }

  const pace =
    paceWindowCount === 0
      ? null
      : (() => {
          const episodesPerWeek = Math.round((paceWindowCount / PACE_WINDOW_WEEKS) * 10) / 10;
          return {
            episodesPerWeek,
            projectedWeeks: Math.ceil(backlogEpisodes / episodesPerWeek),
          };
        })();

  const binges = [...bingeGroups.values()]
    .map((g) => ({ itemId: g.itemId, title: g.title, date: g.date, episodes: g.episodes.size }))
    .filter((b) => b.episodes >= 2)
    .sort((a, b) => b.episodes - a.episodes || (a.date < b.date ? 1 : -1))
    .slice(0, 10);

  const bySeries = [...weeksByItem.entries()]
    .map(([itemId, v]) => ({ itemId, title: v.title, weeks: longestConsecutiveRun(v.weeks) }))
    .sort((a, b) => b.weeks - a.weeks || (a.title < b.title ? -1 : 1))
    .slice(0, 10);

  const years = new Set([...monthlyMinByYear.keys(), ...weeklyMinByIsoYear.keys()]);
  const timeByYear = [...years]
    .sort((a, b) => b - a)
    .map((year) => {
      const monthlyMin = (monthlyMinByYear.get(year) ?? new Array(12).fill(0)).map((m) =>
        Math.round(m),
      );
      const weeklyMin = [...(weeklyMinByIsoYear.get(year) ?? new Map<number, number>()).entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([week, min]) => ({ week, min: Math.round(min) }));
      return {
        year,
        totalMin: monthlyMin.reduce((a, b) => a + b, 0),
        monthlyMin,
        weeklyMin,
      };
    });

  const activityByDay = [...activityByDayCount.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  return {
    recent: {
      last7Days: { episodes: last7Episodes, watchTimeMin: Math.round(last7Min) },
      last30Days: { episodes: last30Episodes, watchTimeMin: Math.round(last30Min) },
      thisMonth: { episodes: thisMonthEpisodes, watchTimeMin: Math.round(thisMonthMin) },
    },
    pace,
    upcoming: computeUpcoming(db, tz, allItemIds, now),
    binges,
    streaks: {
      longestWeeks: longestConsecutiveRun(overallWeeks),
      currentWeeks: currentStreakWeeks(overallWeeks, nowMoment.weekStartMs),
      bySeries,
    },
    timeByYear,
    activityByDay,
    byWeekday,
    byHour,
  };
}
