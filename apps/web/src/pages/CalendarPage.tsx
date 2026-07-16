import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getCalendar, removeLatestEpisodeWatch } from "../api/client.ts";
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
    <div className="inline-flex border border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          aria-pressed={mode === tab}
          className={`px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            mode === tab ? "bg-yellow text-[#080808]" : "text-muted hover:text-snow"
          }`}
        >
          {t(`calendar.mode.${tab}`)}
        </button>
      ))}
    </div>
  );
}

function TimelineView({
  justWatched,
  onToggleWatched,
}: {
  justWatched: Set<number>;
  onToggleWatched: (episodeId: number) => void;
}) {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["calendar", "timeline"], queryFn: () => getCalendar() });
  const todayRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // E73: wait two animation frames (past the initial paint/reflow) before the one-shot,
  // instant anchor scroll — scroll-margin-top on the row uses the Layout-measured header
  // height (--app-header-height), never a guessed scroll-mt constant.
  useEffect(() => {
    if (query.isLoading || hasScrolledRef.current) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        todayRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
        hasScrolledRef.current = true;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [query.isLoading]);

  if (query.isLoading) {
    return <div className="h-64 animate-pulse bg-white/5" />;
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-muted">{t("errors.generic")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="border border-white/10 px-3 py-1.5 font-mono uppercase text-muted hover:text-snow"
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
          className="flex flex-col gap-1"
          style={{ scrollMarginTop: "var(--app-header-height, 4rem)" }}
        >
          <h3 className="text-xs text-muted uppercase">
            {day.date === today
              ? t("calendar.today", { date: day.date })
              : formatDayHeader(day.date)}
          </h3>
          {day.entries.length === 0 ? (
            <p className="px-2 text-sm text-muted">{t("calendar.empty.today")}</p>
          ) : (
            day.entries.map((entry) =>
              entry.airDate <= today ? (
                <CalendarEntryRow
                  key={entry.episodeId}
                  entry={entry}
                  watched={justWatched.has(entry.episodeId)}
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
          className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <span className="font-mono text-xs uppercase tracking-widest text-snow">{monthLabel}</span>
        <button
          type="button"
          onClick={goNext}
          aria-label={t("calendar.nextMonth")}
          className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-snow"
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>

      {query.isLoading ? (
        <div className="h-64 animate-pulse bg-white/5" />
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <p className="text-muted">{t("errors.generic")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="border border-white/10 px-3 py-1.5 font-mono uppercase text-muted hover:text-snow"
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
  // E81: episode ids checked off during this session. Session-scoped by design —
  // the set resets on unmount, so any natural calendar refetch drops the rows
  // (the timeline stays a gap-tracker, not a history view).
  const [justWatched, setJustWatched] = useState<Set<number>>(new Set());

  const markWatched = useMutation({
    mutationFn: (episodeId: number) => addEpisodeWatch(episodeId),
    onSuccess: () => {
      // E81: deliberately NOT invalidating ["calendar"] here — the refetched core
      // query excludes past-aired episodes once watched, which would yank the row.
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (_error, episodeId) => {
      setJustWatched((prev) => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
      toast.show(t("errors.generic"), "error");
    },
  });

  const unmarkWatched = useMutation({
    // E81: deleting the LATEST watch is safe here — the row was unwatched when the
    // calendar loaded (the query excludes watched episodes), so the only watch this
    // episode can carry is the one this session's toggle just created.
    mutationFn: (episodeId: number) => removeLatestEpisodeWatch(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (_error, episodeId) => {
      setJustWatched((prev) => new Set(prev).add(episodeId));
      toast.show(t("errors.generic"), "error");
    },
  });

  function toggleWatched(episodeId: number) {
    if (justWatched.has(episodeId)) {
      // Toggle off: optimistic un-pin, then remove the just-created watch.
      setJustWatched((prev) => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
      unmarkWatched.mutate(episodeId);
    } else {
      // Toggle on: optimistic pin, then record the watch.
      setJustWatched((prev) => new Set(prev).add(episodeId));
      markWatched.mutate(episodeId);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display italic text-snow text-2xl tracking-tight">
          {t("app.nav.calendar")}
        </h1>
        <ModeTabs mode={mode} onChange={setMode} />
      </div>
      {mode === "timeline" ? (
        <TimelineView justWatched={justWatched} onToggleWatched={toggleWatched} />
      ) : (
        <MonthView />
      )}
    </div>
  );
}
