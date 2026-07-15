import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getCalendar } from "../api/client.ts";
import type { CalendarDay } from "../api/types.ts";
import { CalendarEntryRow } from "../components/CalendarEntryRow.tsx";
import { MonthGrid } from "../components/MonthGrid.tsx";
import { todayIso } from "../lib/date.ts";
import { useToast } from "../lib/toast.tsx";

type Mode = "timeline" | "month";

function formatDayHeader(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

/** The API omits days with zero entries — synthesize today so the BUGÜN row always renders. */
function ensureTodayPresent(days: CalendarDay[], today: string): CalendarDay[] {
  if (days.some((d) => d.date === today)) return days;
  return [...days, { date: today, entries: [] }].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useTranslation();
  const tabs: Mode[] = ["timeline", "month"];
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-full px-3 py-1 text-sm ${
            mode === tab ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300"
          }`}
        >
          {t(`calendar.mode.${tab}`)}
        </button>
      ))}
    </div>
  );
}

function TimelineView({ onToggleWatched }: { onToggleWatched: (episodeId: number) => void }) {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["calendar", "timeline"], queryFn: () => getCalendar() });
  const todayRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!query.isLoading && !hasScrolledRef.current) {
      todayRef.current?.scrollIntoView({ block: "start" });
      hasScrolledRef.current = true;
    }
  }, [query.isLoading]);

  if (query.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-zinc-900" />;
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-zinc-400">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded bg-zinc-800 px-3 py-1.5 text-sm"
        >
          {t("errors.retry")}
        </button>
      </div>
    );
  }

  const today = todayIso();
  const days = ensureTodayPresent(query.data?.days ?? [], today);

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <div
          key={day.date}
          ref={day.date === today ? todayRef : undefined}
          className="flex scroll-mt-16 flex-col gap-1"
        >
          <h3 className="text-xs text-zinc-500 uppercase">
            {day.date === today
              ? t("calendar.today", { date: day.date })
              : formatDayHeader(day.date)}
          </h3>
          {day.entries.length === 0 ? (
            <p className="px-2 text-sm text-zinc-600">{t("calendar.empty.today")}</p>
          ) : (
            day.entries.map((entry) =>
              entry.airDate <= today ? (
                <CalendarEntryRow
                  key={entry.episodeId}
                  entry={entry}
                  onToggleWatched={() => onToggleWatched(entry.episodeId)}
                />
              ) : (
                <CalendarEntryRow key={entry.episodeId} entry={entry} />
              ),
            )
          )}
        </div>
      ))}
    </div>
  );
}

function MonthView() {
  const { t } = useTranslation();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(now.getUTCMonth() + 1); // 1-12

  const monthFrom = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  const monthTo = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const query = useQuery({
    queryKey: ["calendar", "month", viewYear, viewMonth],
    queryFn: () => getCalendar({ from: monthFrom, to: monthTo }),
  });

  function goPrev() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(viewYear, viewMonth - 1, 1)),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          aria-label={t("calendar.prevMonth")}
          className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ‹
        </button>
        <span className="font-medium text-sm capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={goNext}
          aria-label={t("calendar.nextMonth")}
          className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ›
        </button>
      </div>

      {query.isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-zinc-900" />
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <p className="text-zinc-400">{t("errors.generic")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="rounded bg-zinc-800 px-3 py-1.5 text-sm"
          >
            {t("errors.retry")}
          </button>
        </div>
      ) : (
        <MonthGrid year={viewYear} month={viewMonth} days={query.data?.days ?? []} />
      )}
    </div>
  );
}

export function CalendarPage() {
  const toast = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("timeline");

  const markWatched = useMutation({
    mutationFn: (episodeId: number) => addEpisodeWatch(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: () => toast.show(t("errors.generic"), "error"),
  });

  return (
    <div className="flex flex-col gap-4">
      <ModeTabs mode={mode} onChange={setMode} />
      {mode === "timeline" ? (
        <TimelineView onToggleWatched={(episodeId) => markWatched.mutate(episodeId)} />
      ) : (
        <MonthView />
      )}
    </div>
  );
}
