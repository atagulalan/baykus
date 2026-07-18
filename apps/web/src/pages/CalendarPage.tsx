import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getCalendar, removeLatestEpisodeWatch } from "../api/client.ts";
import type { CalendarDay, CalendarEntry } from "../api/types.ts";
import { CalendarEntryRow } from "../components/CalendarEntryRow.tsx";
import { MonthGrid } from "../components/MonthGrid.tsx";
import { PullToRefresh, useLibrarySweepRefresh } from "../components/PullToRefresh.tsx";
import { ScheduleGrid } from "../components/ScheduleGrid.tsx";
import { bucketNeedsDaySubheaders, groupIntoTimelineSections } from "../lib/calendarBuckets.ts";
import { getAbsoluteWeek, getIsoWeek, getWeekRange, todayIso } from "../lib/date.ts";
import { useToast } from "../lib/toast.tsx";

/** E133: sticky mode chrome height, published so BUGÜN scroll-margin clears it. */
const MODE_CHROME_HEIGHT_VAR = "--calendar-mode-chrome-height";
/** Combined sticky offset: app header + mode tabs (E133 amends E78's non-sticky row). */
const TODAY_SCROLL_MARGIN =
  "calc(var(--app-header-height, 4rem) + var(--calendar-mode-chrome-height, 2.75rem))";

type Mode = "timeline" | "month" | "schedule";

/** E136: mode → path. Timeline stays at `/calendar` so nav + defaultStartPage keep working. */
const MODE_PATH = {
  timeline: "/calendar",
  month: "/calendar/month",
  schedule: "/calendar/schedule",
} as const satisfies Record<Mode, string>;

/** Tailwind `sm` — month grid only makes sense at this width and above (E135). */
const DESKTOP_QUERY = "(min-width: 640px)";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

const TODAY_SUGGEST_LIMIT = 3;

function formatDayHeader(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

/** Nearest-to-today unwatched past entries first (still visible above the BUGÜN row).
 * Deduplicated by series (itemId), showing the earlier-released episode first. */
export function pickUnwatchedPast(
  days: CalendarDay[],
  today: string,
  justWatched: Set<number>,
): CalendarEntry[] {
  const past = days
    .filter((d) => d.date < today)
    .flatMap((d) => d.entries)
    .filter((e) => !e.isWatched && !justWatched.has(e.episodeId));

  const uniquePast: CalendarEntry[] = [];
  const seen = new Set<number>();
  for (const entry of past) {
    if (!seen.has(entry.itemId)) {
      seen.add(entry.itemId);
      uniquePast.push(entry);
    }
  }

  return uniquePast.slice(-TODAY_SUGGEST_LIMIT).reverse();
}

function pickUpcoming(days: CalendarDay[], today: string): CalendarEntry[] {
  return days
    .filter((d) => d.date > today)
    .flatMap((d) => d.entries)
    .slice(0, TODAY_SUGGEST_LIMIT);
}

function TodayEmptyPanel({
  days,
  today,
  justWatched,
  onToggleWatched,
}: {
  days: CalendarDay[];
  today: string;
  justWatched: Set<number>;
  onToggleWatched: (episodeId: number) => void;
}) {
  const { t } = useTranslation();
  const unwatched = pickUnwatchedPast(days, today, justWatched);
  const upcoming = unwatched.length === 0 ? pickUpcoming(days, today) : [];

  return (
    <div className="flex flex-col gap-3 border border-white/5 bg-[#101010] px-4 py-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-display italic text-xl tracking-tight text-snow">
          {t("calendar.empty.today")}
        </p>
        {unwatched.length > 0 ? (
          <p className="font-mono text-xs text-muted/70">{t("calendar.empty.suggestUnwatched")}</p>
        ) : upcoming.length > 0 ? (
          <p className="font-mono text-xs text-muted/70">{t("calendar.empty.suggestUpcoming")}</p>
        ) : (
          <p className="font-mono text-xs text-muted/70">{t("calendar.empty.suggestAddHint")}</p>
        )}
      </div>

      {unwatched.length > 0 ? (
        <div className="flex flex-col">
          {unwatched.map((entry) => (
            <CalendarEntryRow
              key={entry.episodeId}
              entry={entry}
              watched={justWatched.has(entry.episodeId)}
              onToggleWatched={() => onToggleWatched(entry.episodeId)}
            />
          ))}
        </div>
      ) : upcoming.length > 0 ? (
        <div className="flex flex-col">
          {upcoming.map((entry) => (
            <CalendarEntryRow key={entry.episodeId} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="flex justify-center pt-1">
          <Link
            to="/search"
            className="border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-snow transition-colors hover:bg-white/5"
          >
            {t("calendar.empty.suggestAdd")}
          </Link>
        </div>
      )}
    </div>
  );
}

/** The API omits days with zero entries — synthesize today so the BUGÜN row always renders. */
function ensureTodayPresent(days: CalendarDay[], today: string): CalendarDay[] {
  if (days.some((d) => d.date === today)) return days;
  return [...days, { date: today, entries: [] }].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

function ModeTabs({ mode, showMonth }: { mode: Mode; showMonth: boolean }) {
  const { t } = useTranslation();
  // E135: month tab is desktop-only — on mobile the grid already collapses to a
  // day list that duplicates timeline.
  const tabs: Mode[] = showMonth ? ["timeline", "month", "schedule"] : ["timeline", "schedule"];
  return (
    <div className="inline-flex border border-white/10">
      {tabs.map((tab) => (
        <Link
          key={tab}
          to={MODE_PATH[tab]}
          // Timeline's `/calendar` would otherwise stay active on `/calendar/*`
          // (prefix match). Exact keeps only the current mode segment lit (E136).
          activeOptions={{ exact: true }}
          aria-current={mode === tab ? "page" : undefined}
          className={`px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            mode === tab ? "bg-yellow text-[#080808]" : "text-muted hover:text-snow"
          }`}
        >
          {t(`calendar.mode.${tab}`)}
        </Link>
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
  // instant anchor scroll. E133: scroll-margin clears both the app header and the
  // sticky mode chrome (measured into --calendar-mode-chrome-height).
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

  // E24 gap-tracker: hide past watched rows unless pinned this session (E81).
  // Today always stays so the Bugün section / empty panel can render (E145).
  const visibleDays = days
    .map((day) => {
      const entries = day.entries.filter(
        (entry) => entry.airDate > today || !entry.isWatched || justWatched.has(entry.episodeId),
      );
      return { ...day, entries };
    })
    .filter((day) => day.entries.length > 0 || day.date === today);

  const sections = groupIntoTimelineSections(visibleDays, today);

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section, sectionIdx) => {
        const showDayHeaders = bucketNeedsDaySubheaders(section.bucket);
        const isToday = section.bucket === "today";
        return (
          <section
            key={`${section.bucket}-${section.days[0]?.date ?? sectionIdx}`}
            ref={isToday ? todayRef : undefined}
            className="flex flex-col gap-2"
            style={isToday ? { scrollMarginTop: TODAY_SCROLL_MARGIN } : undefined}
          >
            <h2
              className={`sticky z-20 bg-void/95 py-1.5 text-sm font-semibold backdrop-blur ${
                isToday ? "text-yellow" : "text-snow"
              }`}
              style={{
                top: "calc(var(--app-header-height, 4rem) + var(--calendar-mode-chrome-height, 2.75rem))",
              }}
            >
              {t(`calendar.section.${section.bucket}`)}
            </h2>
            <div className="flex flex-col gap-3">
              {section.days.map((day) => (
                <div key={day.date} className="flex flex-col gap-1">
                  {showDayHeaders ? (
                    <h3 className="text-xs text-muted">{formatDayHeader(day.date)}</h3>
                  ) : null}
                  {day.entries.length === 0 && isToday ? (
                    <TodayEmptyPanel
                      days={days}
                      today={today}
                      justWatched={justWatched}
                      onToggleWatched={onToggleWatched}
                    />
                  ) : (
                    day.entries.map((entry) =>
                      entry.airDate <= today ? (
                        <CalendarEntryRow
                          key={entry.episodeId}
                          entry={entry}
                          watched={justWatched.has(entry.episodeId) || entry.isWatched}
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
          </section>
        );
      })}
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
        <MonthGrid
          year={viewYear}
          month={viewMonth}
          days={(query.data?.days ?? []).map((day) => ({
            ...day,
            // E24: month grid stays a gap-tracker — drop past watched rows.
            entries: day.entries.filter((e) => e.airDate > todayIso() || !e.isWatched),
          }))}
        />
      )}
    </div>
  );
}

function ScheduleView() {
  const { t } = useTranslation();
  const today = todayIso();
  const [visibleWeekLabel, setVisibleWeekLabel] = useState<string>("");

  const query = useInfiniteQuery({
    queryKey: ["calendar", "schedule-infinite"],
    initialPageParam: -8, // start 8 weeks in the past
    queryFn: async ({ pageParam }) => {
      const range = getWeekRange(today, pageParam, 16); // fetch 16 weeks
      const data = await getCalendar({ from: range.from, to: range.to });
      return { data, pageParam };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data.hasMoreFuture === false) return undefined;
      return lastPage.pageParam + 16;
    },
    getPreviousPageParam: (firstPage) => {
      if (firstPage.data.hasMorePast === false) return undefined;
      return firstPage.pageParam - 16;
    },
  });

  const days = query.data?.pages.flatMap((p) => p.data.days) ?? [];

  const currentAbsWeek = getAbsoluteWeek(today);
  let minFetchedAbsWeek: number | undefined;
  let maxFetchedAbsWeek: number | undefined;

  if (query.data?.pages && query.data.pages.length > 0) {
    const minPageParam = Math.min(...query.data.pages.map((p) => p.pageParam));
    const maxPageParam = Math.max(...query.data.pages.map((p) => p.pageParam));

    minFetchedAbsWeek = currentAbsWeek + minPageParam;
    maxFetchedAbsWeek = currentAbsWeek + maxPageParam + 15; // 16 weeks span
  }

  useEffect(() => {
    if (!visibleWeekLabel) {
      const iso = getIsoWeek(today);
      setVisibleWeekLabel(
        t("calendar.weekHeader", {
          year: iso.year,
          week: iso.week,
          defaultValue: `${iso.year} - ${iso.week}. Hafta`,
        }),
      );
    }
  }, [today, t, visibleWeekLabel]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-4 h-11">
        <span className="font-mono text-xs uppercase tracking-widest text-snow">
          {visibleWeekLabel}
        </span>
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
        <ScheduleGrid
          days={days}
          minFetchedAbsWeek={minFetchedAbsWeek}
          maxFetchedAbsWeek={maxFetchedAbsWeek}
          hasNextPageRight={query.hasNextPage}
          hasNextPageLeft={query.hasPreviousPage}
          onVisibleWeekChange={setVisibleWeekLabel}
          autoScrollToCurrentWeek={true}
          onLoadMoreRight={query.fetchNextPage}
          onLoadMoreLeft={query.fetchPreviousPage}
        />
      )}
    </div>
  );
}

export function CalendarPage({ mode }: { mode: Mode }) {
  const toast = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  // E81: episode ids checked off during this session. Session-scoped by design —
  // the set resets on unmount, so any natural calendar refetch drops the rows
  // (the timeline stays a gap-tracker, not a history view).
  const [justWatched, setJustWatched] = useState<Set<number>>(new Set());
  // E132: pulling refetches ["calendar"] too — a natural refetch per E81, so
  // session-pinned watched rows dropping out afterwards is correct.
  const pullRefresh = useLibrarySweepRefresh(["calendar"]);

  // E133 / E136: each mode is its own route component — scroll to top on mount
  // so month/schedule don't inherit the timeline's BUGÜN scroll depth (and vice
  // versa). Timeline then re-runs the E73 today anchor from scrollY === 0.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // E133: publish sticky mode-chrome height so the BUGÜN anchor clears it.
  const modeChromeObserverRef = useRef<ResizeObserver | null>(null);
  const modeChromeRef = useCallback((el: HTMLElement | null) => {
    modeChromeObserverRef.current?.disconnect();
    modeChromeObserverRef.current = null;
    if (!el) {
      document.documentElement.style.removeProperty(MODE_CHROME_HEIGHT_VAR);
      return;
    }
    const chrome = el;
    function updateHeight() {
      document.documentElement.style.setProperty(
        MODE_CHROME_HEIGHT_VAR,
        `${chrome.getBoundingClientRect().height}px`,
      );
    }
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(chrome);
    modeChromeObserverRef.current = observer;
  }, []);

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

  // E135: month URL is desktop-only — replace-redirect to timeline on mobile so
  // a bookmarked /calendar/month never leaves a hidden tab selected.
  if (!isDesktop && mode === "month") {
    return <Navigate to="/calendar" replace />;
  }

  return (
    <PullToRefresh onRefresh={pullRefresh}>
      <div className="flex flex-col gap-4">
        {/* E133: sticky below the app header so mode switching stays reachable
            after the timeline anchors to BUGÜN (amends 006 E78 non-sticky row). */}
        <div
          ref={modeChromeRef}
          style={{ top: "var(--app-header-height, 3.5rem)" }}
          className="sticky z-30 -mx-3 flex items-center justify-end border-b border-white/5 bg-void/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:justify-between sm:px-6"
        >
          <h1 className="hidden font-display italic text-snow text-2xl tracking-tight sm:block">
            {t("app.nav.calendar")}
          </h1>
          <ModeTabs mode={mode} showMonth={isDesktop} />
        </div>
        {mode === "timeline" ? (
          <TimelineView justWatched={justWatched} onToggleWatched={toggleWatched} />
        ) : mode === "month" ? (
          <MonthView />
        ) : (
          <ScheduleView />
        )}
      </div>
    </PullToRefresh>
  );
}
