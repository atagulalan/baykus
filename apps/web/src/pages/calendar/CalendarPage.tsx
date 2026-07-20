import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { addEpisodeWatch, getCalendar, removeLatestEpisodeWatch } from "../../api/client.ts";
import type { CalendarDay, CalendarEntry } from "../../api/types.ts";
import { SectionPill } from "../../components/atoms/SectionPill/SectionPill.tsx";
import {
  SkeletonCalendarTimeline,
  SkeletonMonthGrid,
  SkeletonScheduleGrid,
} from "../../components/atoms/Skeleton/Skeleton.tsx";
import { CalendarModeToggle } from "../../components/layout/Layout/LayoutToggles.tsx";
import { PAGE_HEADING_ACTION_CLASS } from "../../components/layout/Layout/layoutShared.ts";
import { CalendarEntryRow } from "../../components/molecules/CalendarEntryRow/CalendarEntryRow.tsx";
import { PageTitleRow } from "../../components/molecules/PageTitleRow/PageTitleRow.tsx";
import {
  PullToRefresh,
  useLibrarySweepRefresh,
} from "../../components/molecules/PullToRefresh/PullToRefresh.tsx";
import { MonthGrid } from "../../components/organisms/MonthGrid/MonthGrid.tsx";
import { ScheduleGrid } from "../../components/organisms/ScheduleGrid/ScheduleGrid.tsx";
import { isEpisodeAired } from "../../lib/airing.ts";
import {
  bucketNeedsDaySubheaders,
  groupIntoTimelineSections,
  rebucketCalendarDays,
} from "../../lib/calendarBuckets.ts";
import { getAbsoluteWeek, getIsoWeek, getWeekRange, todayIso } from "../../lib/date.ts";
import { pageViewTransition } from "../../lib/pageViewTransition.ts";
import { CALENDAR_SCROLL_KEY, clearScrollRestorationKey } from "../../lib/scrollRestoration.ts";
import { useToast } from "../../lib/toast.tsx";

/** The mode toggle lives in the sticky app navbar, so BUGÜN clears only that header. */
const TODAY_SCROLL_MARGIN = "var(--app-header-height, 4rem)";

type Mode = "timeline" | "month" | "schedule";

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
    <div className="flex flex-col gap-3 py-6">
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
            viewTransition={pageViewTransition}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-yellow px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[#080808] shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
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

function TimelineView({
  justWatched,
  onToggleWatched,
}: {
  justWatched: Set<number>;
  onToggleWatched: (episodeId: number) => void;
}) {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["calendar", "timeline"], queryFn: () => getCalendar() });
  const todayRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const hasScrolledRef = useRef(false);

  function scrollToSection(sectionKey: string) {
    sectionRefs.current.get(sectionKey)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // E73: wait until any route view-transition finishes, then smooth-scroll to
  // BUGÜN. Instant scroll mid-VT fights the app-main cross-fade.
  useEffect(() => {
    if (query.isLoading || hasScrolledRef.current) return;
    let cancelled = false;
    let raf = 0;

    function isVtActive(): boolean {
      try {
        return document.documentElement.matches(":active-view-transition");
      } catch {
        return false;
      }
    }

    function scrollToToday() {
      if (cancelled || hasScrolledRef.current) return;
      todayRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      hasScrolledRef.current = true;
    }

    function whenReady() {
      if (cancelled) return;
      if (isVtActive()) {
        raf = requestAnimationFrame(whenReady);
        return;
      }
      // Two frames past VT so layout/scroll-margin settle, then animate.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(scrollToToday);
      });
    }

    whenReady();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [query.isLoading]);

  if (query.isLoading) {
    return <SkeletonCalendarTimeline />;
  }

  if (query.isError) {
    return (
      <div className="content-inset flex flex-col items-center gap-2 py-24 text-center">
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
  // airStamp local day can differ from provider airDate (US network date).
  const days = ensureTodayPresent(rebucketCalendarDays(query.data?.days ?? []), today);

  // E24 gap-tracker: hide past watched rows unless pinned this session (E81).
  // Today always stays so the Bugün section / empty panel can render (E145).
  // "Past" is airStamp-aware (isEpisodeAired), not plain airDate.
  const visibleDays = days
    .map((day) => {
      const entries = day.entries.filter(
        (entry) => !isEpisodeAired(entry) || !entry.isWatched || justWatched.has(entry.episodeId),
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
        const sectionKey = `${section.bucket}-${section.days[0]?.date ?? sectionIdx}`;
        return (
          <section
            key={sectionKey}
            ref={(el) => {
              if (el) {
                sectionRefs.current.set(sectionKey, el);
                if (isToday) todayRef.current = el;
              } else {
                sectionRefs.current.delete(sectionKey);
                if (isToday) todayRef.current = null;
              }
            }}
            className="flex flex-col gap-2"
            style={{ scrollMarginTop: TODAY_SCROLL_MARGIN }}
          >
            <div
              className="sticky z-30 flex justify-center py-1 list-inset"
              style={{ top: "var(--app-header-height, 4rem)" }}
            >
              <SectionPill
                className={`text-sm font-semibold ${isToday ? "text-yellow" : "text-snow"}`}
                onClick={() => scrollToSection(sectionKey)}
              >
                {t(`calendar.section.${section.bucket}`)}
              </SectionPill>
            </div>
            <div className="flex flex-col gap-3">
              {section.days.map((day) => (
                <div key={day.date} className="flex flex-col gap-1">
                  {showDayHeaders ? (
                    <h3 className="list-inset text-xs text-muted">{formatDayHeader(day.date)}</h3>
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
                      isEpisodeAired(entry) ? (
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
    <div className="content-inset flex flex-col gap-3">
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
        <SkeletonMonthGrid />
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
          days={rebucketCalendarDays(query.data?.days ?? []).map((day) => ({
            ...day,
            // E24: month grid stays a gap-tracker — drop past watched rows.
            entries: day.entries.filter((e) => !isEpisodeAired(e) || !e.isWatched),
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

  const days = rebucketCalendarDays(query.data?.pages.flatMap((p) => p.data.days) ?? []);

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
        <SkeletonScheduleGrid />
      ) : query.isError ? (
        <div className="content-inset flex flex-col items-center gap-2 py-24 text-center">
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
  // Clear saved calendar scroll on leave so tab switches don't restore a stale
  // depth after TanStack scroll restoration (onBeforeLoad snapshots first).
  // Defer the reset until any route VT finishes so we don't fight app-main fade.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    function isVtActive(): boolean {
      try {
        return document.documentElement.matches(":active-view-transition");
      } catch {
        return false;
      }
    }

    function resetScroll() {
      if (cancelled) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    function whenReady() {
      if (cancelled) return;
      if (isVtActive()) {
        raf = requestAnimationFrame(whenReady);
        return;
      }
      resetScroll();
    }

    whenReady();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearScrollRestorationKey(CALENDAR_SCROLL_KEY);
    };
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
      <div className="page-top-flush flex flex-col gap-4 sm:px-3 lg:px-0">
        <PageTitleRow
          action={<CalendarModeToggle pathname={pathname} className={PAGE_HEADING_ACTION_CLASS} />}
        >
          {t("app.nav.calendar")}
        </PageTitleRow>
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
