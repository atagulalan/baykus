import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { CalendarDay, CalendarEntry } from "../api/types.ts";
import { EpisodeTags } from "./EpisodeTags.tsx";

const MAX_CELL_ENTRIES = 3;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday-first grid cells spanning full weeks, covering every day of `year`-`month` (1-12). */
function buildMonthCells(year: number, month: number): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = (first.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  const gridStart = new Date(first);
  gridStart.setUTCDate(gridStart.getUTCDate() - startWeekday);

  const last = new Date(Date.UTC(year, month, 0)); // last day of month
  const endWeekday = (last.getUTCDay() + 6) % 7;
  const gridEnd = new Date(last);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - endWeekday));

  const cells: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    cells.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
}

/** Locale weekday abbreviations, Monday first — derived from a known Monday rather than hardcoded strings. */
function weekdayShortLabels(): string[] {
  const monday = new Date(Date.UTC(2024, 0, 1)); // 2024-01-01 was a Monday (UTC)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(d);
  });
}

function CompactEntry({ entry }: { entry: CalendarEntry }) {
  return (
    <Link
      to="/series/$id"
      params={{ id: String(entry.itemId) }}
      className="flex flex-col gap-0.5 rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-zinc-800"
    >
      <span className="truncate">
        {entry.title} S{entry.s}E{entry.e}
      </span>
      <EpisodeTags
        s={entry.s}
        e={entry.e}
        airDate={entry.airDate}
        episodeType={entry.episodeType}
        episodeTitle={entry.episodeTitle}
        seasonName={entry.seasonName}
      />
    </Link>
  );
}

interface MonthGridProps {
  year: number;
  month: number;
  days: CalendarDay[];
}

/** Month mode: Monday-first grid (desktop) or a vertical list of non-empty days (mobile, <640px). */
export function MonthGrid({ year, month, days }: MonthGridProps) {
  const { t } = useTranslation();
  const today = toIsoDate(new Date());
  const entriesByDate = new Map(days.map((d) => [d.date, d.entries]));
  const cells = buildMonthCells(year, month);
  const weekdayLabels = weekdayShortLabels();
  const nonEmptyDays = days.filter((d) => d.entries.length > 0);

  return (
    <div>
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-zinc-800 text-xs text-zinc-400">
          {weekdayLabels.map((label) => (
            <div key={label} className="bg-zinc-900 px-2 py-1 text-center">
              {label}
            </div>
          ))}
          {cells.map((date) => {
            const entries = entriesByDate.get(date) ?? [];
            const inMonth = Number(date.slice(5, 7)) === month;
            const isToday = date === today;
            const overflow = entries.length - MAX_CELL_ENTRIES;
            return (
              <div
                key={date}
                className={`flex min-h-20 flex-col gap-0.5 bg-zinc-900 p-1 ${
                  inMonth ? "" : "opacity-40"
                } ${isToday ? "ring-1 ring-inset ring-emerald-500" : ""}`}
              >
                <span className="px-1 text-[11px] text-zinc-500">{Number(date.slice(8, 10))}</span>
                {entries.slice(0, MAX_CELL_ENTRIES).map((entry) => (
                  <CompactEntry key={entry.episodeId} entry={entry} />
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[10px] text-zinc-500">
                    {t("calendar.overflow", { count: overflow })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {nonEmptyDays.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("calendar.empty.month")}</p>
        ) : (
          nonEmptyDays.map((day) => (
            <div key={day.date} className="flex flex-col gap-1">
              <h3 className="text-xs text-zinc-500 uppercase">
                {day.date === today
                  ? t("calendar.today", { date: day.date })
                  : new Intl.DateTimeFormat("tr-TR", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    }).format(new Date(`${day.date}T00:00:00Z`))}
              </h3>
              {day.entries.map((entry) => (
                <CompactEntry key={entry.episodeId} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
