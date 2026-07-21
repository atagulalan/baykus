import {
  ApiError,
  addEpisodeWatch,
  buildImageUrl,
  type CalendarDay,
  type CalendarEntry,
  getCalendar,
  removeLatestEpisodeWatch,
  seriesParam,
} from "@baykus/api-client";
import {
  CalendarEntryRow,
  cn,
  EmptyPanel,
  PageTitle,
  PullToRefresh,
  ScheduleGrid,
  SectionHeader,
  SegmentedButtonGroup,
  SkeletonBone,
  todayIso,
} from "@baykus/ui";
import { router } from "expo-router";
import { CalendarDays, LogIn } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import {
  bucketNeedsDaySubheaders,
  filterGapTrackerEntries,
  groupIntoTimelineSections,
  rebucketCalendarDays,
  type TimelineBucketId,
} from "../../src/lib/calendarBuckets.ts";

type CalMode = "timeline" | "month" | "schedule";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthBounds(anchor: string): { from: string; to: string } {
  const [y, m] = anchor.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function mapEntry(entry: CalendarEntry) {
  const provider = entry.watchProviders[0];
  return {
    episodeId: entry.episodeId,
    itemId: entry.itemId,
    title: entry.title,
    posterUrl: buildImageUrl(entry.posterRef, "thumb"),
    s: entry.s,
    e: entry.e,
    episodeTitle: entry.episodeTitle,
    networkOrProvider: provider ? `${provider.provider} (${provider.region})` : entry.network,
    airDate: entry.airDate,
    airStamp: entry.airStamp,
    episodeType: entry.episodeType,
    seasonName: entry.seasonName,
  };
}

function mergeCalendarDays(a: CalendarDay[], b: CalendarDay[]): CalendarDay[] {
  const map = new Map<string, CalendarEntry[]>();
  for (const day of [...a, ...b]) {
    const list = map.get(day.date) ?? [];
    const seen = new Set(list.map((e) => e.episodeId));
    for (const e of day.entries) {
      if (seen.has(e.episodeId)) continue;
      list.push(e);
      seen.add(e.episodeId);
    }
    map.set(day.date, list);
  }
  return [...map.entries()]
    .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
    .map(([date, entries]) => ({ date, entries }));
}

const SCHEDULE_CHUNK_DAYS = 112;

function MonthGrid({
  days,
  month,
  selected,
  onSelect,
}: {
  days: CalendarDay[];
  month: string;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d.entries.length])), [days]);
  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y!, m! - 1, 1)).getUTCDay(); // 0 Sun
  const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const cells: Array<{ key: string; date: string | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: `${month}-pad-${i}`, date: null });
  for (let d = 1; d <= lastDay; d++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key: date, date });
  }
  const today = todayIso();

  return (
    <View className="px-3">
      <View className="mb-2 flex-row">
        {(
          [
            ["sun", "S"],
            ["mon", "M"],
            ["tue", "T"],
            ["wed", "W"],
            ["thu", "T"],
            ["fri", "F"],
            ["sat", "S"],
          ] as const
        ).map(([key, label]) => (
          <Text key={key} className="flex-1 text-center font-mono text-[10px] text-muted">
            {label}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((cell) => {
          if (!cell.date) {
            return <View key={cell.key} className="aspect-square w-[14.28%]" />;
          }
          const date = cell.date;
          const count = byDate.get(date) ?? 0;
          const isSelected = selected === date;
          const isToday = date === today;
          return (
            <Pressable
              key={cell.key}
              accessibilityRole="button"
              onPress={() => onSelect(date)}
              className={cn(
                "aspect-square w-[14.28%] items-center justify-center rounded-lg",
                isSelected && "bg-yellow",
                !isSelected && isToday && "border border-yellow/50",
                !isSelected && "active:bg-white/5",
              )}
            >
              <Text className={cn("font-mono text-xs", isSelected ? "text-void" : "text-snow")}>
                {Number(date.slice(8))}
              </Text>
              {count > 0 ? (
                <Text
                  className={cn(
                    "font-mono text-[9px]",
                    isSelected ? "text-void/70" : "text-yellow",
                  )}
                >
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CalMode>("timeline");
  const [monthAnchor, setMonthAnchor] = useState(() => todayIso().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checkedOff, setCheckedOff] = useState<Set<number>>(() => new Set());
  const scheduleRangeRef = useRef({
    from: addDays(todayIso(), -56),
    to: addDays(todayIso(), SCHEDULE_CHUNK_DAYS),
  });
  const [hasMorePast, setHasMorePast] = useState(true);
  const [hasMoreFuture, setHasMoreFuture] = useState(true);
  const [paging, setPaging] = useState(false);

  const needsAuth = session?.mode === "multi" && !session.authenticated;

  const tagLabels = useMemo(
    () => ({
      new: t("episode.tag.new"),
      upcoming: t("episode.tag.upcoming"),
      premiere: t("episode.tag.premiere"),
      finale: t("episode.finale"),
      special: t("episode.tag.special"),
      ova: t("episode.tag.ova"),
    }),
    [t],
  );

  const load = useCallback(async () => {
    if (needsAuth) {
      setDays([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const range =
        mode === "schedule"
          ? scheduleRangeRef.current
          : mode === "month"
            ? monthBounds(`${monthAnchor}-01`)
            : (() => {
                const today = todayIso();
                return { from: addDays(today, -21), to: addDays(today, 28) };
              })();
      const res = await getCalendar(range);
      setDays(res.days);
      if (mode === "schedule") {
        setHasMorePast(res.hasMorePast !== false);
        setHasMoreFuture(res.hasMoreFuture !== false);
      }
    } catch (err) {
      setDays([]);
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsAuth, mode, monthAnchor]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  const extendSchedule = useCallback(
    async (dir: "past" | "future") => {
      if (paging || needsAuth) return;
      if (dir === "past" && !hasMorePast) return;
      if (dir === "future" && !hasMoreFuture) return;
      setPaging(true);
      setError(null);
      try {
        const { from, to } = scheduleRangeRef.current;
        const range =
          dir === "past"
            ? { from: addDays(from, -SCHEDULE_CHUNK_DAYS), to: addDays(from, -1) }
            : { from: addDays(to, 1), to: addDays(to, SCHEDULE_CHUNK_DAYS) };
        const res = await getCalendar(range);
        setDays((prev) => mergeCalendarDays(prev, res.days));
        scheduleRangeRef.current =
          dir === "past" ? { from: range.from, to } : { from, to: range.to };
        if (dir === "past") setHasMorePast(res.hasMorePast !== false);
        else setHasMoreFuture(res.hasMoreFuture !== false);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "load_failed",
        );
      } finally {
        setPaging(false);
      }
    },
    [paging, needsAuth, hasMorePast, hasMoreFuture],
  );

  const displayDays = useMemo(() => rebucketCalendarDays(days), [days]);

  async function toggle(entry: CalendarEntry) {
    const watched = entry.isWatched || checkedOff.has(entry.episodeId);
    setBusyId(entry.episodeId);
    try {
      if (watched) {
        await removeLatestEpisodeWatch(entry.episodeId);
        setCheckedOff((prev) => {
          const next = new Set(prev);
          next.delete(entry.episodeId);
          return next;
        });
      } else {
        await addEpisodeWatch(entry.episodeId);
        setCheckedOff((prev) => new Set(prev).add(entry.episodeId));
      }
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "watch_failed",
      );
    } finally {
      setBusyId(null);
    }
  }

  function renderEntry(entry: CalendarEntry) {
    const watched = entry.isWatched || checkedOff.has(entry.episodeId);
    return (
      <CalendarEntryRow
        key={`${entry.episodeId}-${entry.airDate}`}
        entry={mapEntry(entry)}
        watched={watched}
        tagLabels={tagLabels}
        onPress={() => router.push(`/series/${seriesParam({ id: entry.itemId, tmdbId: null })}`)}
        {...(busyId === entry.episodeId
          ? {}
          : {
              onToggleWatched: () => {
                void toggle(entry);
              },
            })}
      />
    );
  }

  const scheduleDays = useMemo(() => {
    const today = todayIso();
    return rebucketCalendarDays(days).map((d) => ({
      date: d.date,
      entries: filterGapTrackerEntries(d.entries, today).map((entry) => ({
        episodeId: entry.episodeId,
        itemId: entry.itemId,
        title: entry.title,
        posterRef: entry.posterRef,
        s: entry.s,
        e: entry.e,
        episodeTitle: entry.episodeTitle,
        airDate: entry.airDate,
        airStamp: entry.airStamp,
        isWatched: entry.isWatched || checkedOff.has(entry.episodeId),
      })),
    }));
  }, [days, checkedOff]);

  const monthDays = useMemo(() => {
    const today = todayIso();
    return rebucketCalendarDays(days).map((d) => ({
      ...d,
      entries: filterGapTrackerEntries(d.entries, today),
    }));
  }, [days]);

  const monthDayEntries = useMemo(() => {
    if (!selectedDay) return [];
    return monthDays.find((d) => d.date === selectedDay)?.entries ?? [];
  }, [monthDays, selectedDay]);

  const timelineSections = useMemo(() => {
    const today = todayIso();
    const filtered = displayDays.map((d) => ({
      ...d,
      entries: filterGapTrackerEntries(d.entries, today).map((e) => ({
        ...e,
        isWatched: e.isWatched || checkedOff.has(e.episodeId),
      })),
    }));
    return groupIntoTimelineSections(
      filtered.filter((d) => d.entries.length > 0),
      today,
    );
  }, [displayDays, checkedOff]);

  function bucketLabel(bucket: TimelineBucketId): string {
    return t(`calendar.bucket.${bucket}`, {
      defaultValue:
        bucket === "today"
          ? "Today"
          : bucket === "earlier"
            ? "Earlier"
            : bucket === "laterThisWeek"
              ? "Later this week"
              : "Later",
    });
  }

  if (authLoading || loading) {
    return (
      <View className="flex-1 bg-void px-4 pt-4">
        <SkeletonBone className="mb-4 h-8 w-36" />
        {[0, 1, 2].map((i) => (
          <SkeletonBone key={i} className="mb-2 h-16 w-full rounded-md" />
        ))}
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View className="flex-1 justify-center bg-void">
        <EmptyPanel
          icon={LogIn}
          title="Sign in for calendar"
          hint="Multi-mode requires a session."
        />
      </View>
    );
  }

  return (
    <PullToRefresh
      className="flex-1 bg-void"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
      }}
    >
      <View className="mb-4 gap-3 px-4">
        <PageTitle>{t("app.nav.calendar")}</PageTitle>
        <SegmentedButtonGroup
          value={mode}
          onChange={(next) => {
            setMode(next);
            setSelectedDay(null);
            if (next === "schedule") {
              const today = todayIso();
              scheduleRangeRef.current = {
                from: addDays(today, -56),
                to: addDays(today, SCHEDULE_CHUNK_DAYS),
              };
              setHasMorePast(true);
              setHasMoreFuture(true);
            }
          }}
          options={[
            { value: "timeline", label: t("calendar.mode.timeline") },
            { value: "month", label: t("calendar.mode.month") },
            { value: "schedule", label: t("calendar.mode.schedule") },
          ]}
        />
      </View>

      {error ? <Text className="mb-3 px-4 font-mono text-xs text-red-400">{error}</Text> : null}

      {mode === "month" ? (
        <View className="mb-4 gap-3">
          <View className="flex-row items-center justify-between px-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const [y, m] = monthAnchor.split("-").map(Number);
                const d = new Date(Date.UTC(y!, m! - 2, 1));
                setMonthAnchor(
                  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
                );
                setSelectedDay(null);
              }}
              className="rounded-full border border-white/10 px-3 py-1 active:bg-white/5"
            >
              <Text className="font-mono text-xs text-muted">←</Text>
            </Pressable>
            <Text className="font-mono text-xs uppercase tracking-widest text-snow">
              {monthAnchor}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const [y, m] = monthAnchor.split("-").map(Number);
                const d = new Date(Date.UTC(y!, m!, 1));
                setMonthAnchor(
                  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
                );
                setSelectedDay(null);
              }}
              className="rounded-full border border-white/10 px-3 py-1 active:bg-white/5"
            >
              <Text className="font-mono text-xs text-muted">→</Text>
            </Pressable>
          </View>
          <MonthGrid
            days={monthDays}
            month={monthAnchor}
            selected={selectedDay}
            onSelect={setSelectedDay}
          />
          {selectedDay ? (
            <View className="mt-2">
              <SectionHeader label={selectedDay} count={monthDayEntries.length} />
              {monthDayEntries.length === 0 ? (
                <Text className="px-4 py-4 font-mono text-xs text-muted">No airings this day.</Text>
              ) : (
                monthDayEntries.map(renderEntry)
              )}
            </View>
          ) : (
            <Text className="px-4 font-mono text-[10px] text-muted">Tap a day to see airings.</Text>
          )}
        </View>
      ) : null}

      {mode === "schedule" ? (
        days.length === 0 ? (
          <EmptyPanel
            icon={CalendarDays}
            title={t("calendar.nothingFurther")}
            hint={t("calendar.empty.suggestUpcoming")}
          />
        ) : (
          <ScheduleGrid
            days={scheduleDays}
            locale={i18n.language?.startsWith("en") ? "en-US" : "tr-TR"}
            onPressEpisode={(entry) =>
              router.push(`/series/${seriesParam({ id: entry.itemId, tmdbId: null })}`)
            }
            onNearStart={() => {
              void extendSchedule("past");
            }}
            onNearEnd={() => {
              void extendSchedule("future");
            }}
          />
        )
      ) : null}

      {mode === "timeline" ? (
        timelineSections.length === 0 ? (
          <EmptyPanel
            icon={CalendarDays}
            title="No airings"
            hint="Nothing in this window — refresh metadata or try Month / Schedule."
          />
        ) : (
          timelineSections.map((section) => (
            <View key={section.bucket} className="mb-6">
              <SectionHeader
                label={bucketLabel(section.bucket)}
                count={section.days.reduce((n, d) => n + d.entries.length, 0)}
              />
              {section.days.map((day) => (
                <View key={day.date} className="mb-3">
                  {bucketNeedsDaySubheaders(section.bucket) ? (
                    <Text className="mb-1 px-4 font-mono text-[10px] uppercase tracking-widest text-muted">
                      {day.date}
                    </Text>
                  ) : null}
                  <View>{day.entries.map(renderEntry)}</View>
                </View>
              ))}
            </View>
          ))
        )
      ) : null}
    </PullToRefresh>
  );
}
