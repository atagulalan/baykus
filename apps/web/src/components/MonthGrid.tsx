import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getSeriesByParam } from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type { CalendarDay, CalendarEntry } from "../api/types.ts";
import { todayIso } from "../lib/date.ts";
import { CalendarEntryRow } from "./CalendarEntryRow.tsx";
import { EpisodeLabel } from "./EpisodeLabel.tsx";
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

function formatDayHeader(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

function CompactEntry({ entry }: { entry: CalendarEntry }) {
  const queryClient = useQueryClient();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = buildImageUrl(entry.posterRef);
  return (
    <Link
      to="/series/$id"
      params={{ id: `i${entry.itemId}` }}
      className="flex items-start gap-2 px-1.5 py-1 text-[11px] leading-tight hover:bg-white/5 transition-colors"
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: ["series", `i${entry.itemId}`],
          queryFn: () => getSeriesByParam(`i${entry.itemId}`),
        });
      }}
      onClickCapture={(e) => {
        document
          .querySelectorAll(`[style*="view-transition-name: poster-${entry.itemId}"]`)
          .forEach((el) => {
            (el as HTMLElement).style.viewTransitionName = "";
          });
        const img = e.currentTarget.querySelector("img");
        if (img) img.style.viewTransitionName = `poster-${entry.itemId}`;
      }}
    >
      {imageUrl && !imageFailed && (
        <img
          src={imageUrl}
          alt=""
          className="aspect-[2/3] w-6 shrink-0 object-cover opacity-90"
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-display italic text-snow">
          {entry.title}{" "}
          <EpisodeLabel s={entry.s} e={entry.e} className="not-italic text-muted text-[10px]" />
        </span>
        <EpisodeTags
          s={entry.s}
          e={entry.e}
          airDate={entry.airDate}
          episodeType={entry.episodeType}
          episodeTitle={entry.episodeTitle}
          seasonName={entry.seasonName}
        />
      </div>
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
  const today = todayIso();
  const entriesByDate = new Map(days.map((d) => [d.date, d.entries]));
  const cells = buildMonthCells(year, month);
  const weekdayLabels = weekdayShortLabels();
  const nonEmptyDays = days.filter((d) => d.entries.length > 0);

  return (
    <div>
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 gap-px overflow-hidden border border-white/5 bg-white/5 font-mono">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="bg-void px-2 py-3 text-center uppercase tracking-widest text-[9px] text-muted"
            >
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
                className={`flex min-h-24 flex-col gap-1 bg-[#101010] p-1.5 ${
                  inMonth ? "" : "opacity-30"
                } ${isToday ? "ring-1 ring-inset ring-yellow/50 bg-yellow/5" : "hover:bg-white/5 transition-colors"}`}
              >
                <span className={`px-1 text-[10px] ${isToday ? "text-yellow" : "text-muted/50"}`}>
                  {Number(date.slice(8, 10))}
                </span>
                {entries.slice(0, MAX_CELL_ENTRIES).map((entry) => (
                  <CompactEntry key={entry.episodeId} entry={entry} />
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[9px] text-muted/70">
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
          <p className="text-sm text-muted">{t("calendar.empty.month")}</p>
        ) : (
          nonEmptyDays.map((day) => (
            <div key={day.date} className="flex flex-col gap-1">
              <h3 className="text-xs text-muted uppercase">
                {day.date === today
                  ? t("calendar.today", { date: formatDayHeader(day.date) })
                  : formatDayHeader(day.date)}
              </h3>
              {day.entries.map((entry) => (
                <CalendarEntryRow key={entry.episodeId} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
