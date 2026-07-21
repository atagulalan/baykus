import {
  addEpisodeWatch,
  ApiError,
  buildImageUrl,
  getCalendar,
  removeLatestEpisodeWatch,
  seriesParam,
  type CalendarDay,
  type CalendarEntry,
} from "@baykus/api-client";
import {
  CalendarEntryRow,
  EmptyPanel,
  PageTitle,
  PullToRefresh,
  SectionHeader,
  SegmentedButtonGroup,
  SkeletonBone,
  cn,
  todayIso,
} from "@baykus/ui";
import { router } from "expo-router";
import { CalendarDays, LogIn } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";

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
    networkOrProvider: provider
      ? `${provider.provider} (${provider.region})`
      : entry.network,
  };
}

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
  const cells: Array<string | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  const today = todayIso();

  return (
    <View className="px-3">
      <View className="mb-2 flex-row">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
          <Text key={`${label}-${i}`} className="flex-1 text-center font-mono text-[10px] text-muted">
            {label}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((date, i) => {
          if (!date) {
            return <View key={`e-${i}`} className="aspect-square w-[14.28%]" />;
          }
          const count = byDate.get(date) ?? 0;
          const isSelected = selected === date;
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              onPress={() => onSelect(date)}
              className={cn(
                "aspect-square w-[14.28%] items-center justify-center rounded-lg",
                isSelected && "bg-yellow",
                !isSelected && isToday && "border border-yellow/50",
                !isSelected && "active:bg-white/5",
              )}
            >
              <Text
                className={cn(
                  "font-mono text-xs",
                  isSelected ? "text-void" : "text-snow",
                )}
              >
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

  const needsAuth = session?.mode === "multi" && !session.authenticated;

  const window = useMemo(() => {
    const today = todayIso();
    if (mode === "month") return monthBounds(`${monthAnchor}-01`);
    if (mode === "schedule") return { from: today, to: addDays(today, 60) };
    return { from: addDays(today, -3), to: addDays(today, 14) };
  }, [mode, monthAnchor]);

  const load = useCallback(async () => {
    if (needsAuth) {
      setDays([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await getCalendar(window);
      setDays(res.days);
    } catch (err) {
      setDays([]);
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsAuth, window]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

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
        onPress={() =>
          router.push(`/series/${seriesParam({ id: entry.itemId, tmdbId: null })}`)
        }
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

  const scheduleEntries = useMemo(() => {
    return days
      .flatMap((d) => d.entries.map((e) => ({ ...e, _day: d.date })))
      .sort((a, b) => {
        const ta = a.airStamp ?? `${a.airDate}T00:00:00Z`;
        const tb = b.airStamp ?? `${b.airDate}T00:00:00Z`;
        return ta.localeCompare(tb);
      });
  }, [days]);

  const monthDayEntries = useMemo(() => {
    if (!selectedDay) return [];
    return days.find((d) => d.date === selectedDay)?.entries ?? [];
  }, [days, selectedDay]);

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
        <EmptyPanel icon={LogIn} title="Sign in for calendar" hint="Multi-mode requires a session." />
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
        <PageTitle>Calendar</PageTitle>
        <SegmentedButtonGroup
          value={mode}
          onChange={(next) => {
            setMode(next);
            setSelectedDay(null);
          }}
          options={[
            { value: "timeline", label: "Timeline" },
            { value: "month", label: "Month" },
            { value: "schedule", label: "Schedule" },
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
                setMonthAnchor(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
                setSelectedDay(null);
              }}
              className="rounded-full border border-white/10 px-3 py-1 active:bg-white/5"
            >
              <Text className="font-mono text-xs text-muted">←</Text>
            </Pressable>
            <Text className="font-mono text-xs uppercase tracking-widest text-snow">{monthAnchor}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const [y, m] = monthAnchor.split("-").map(Number);
                const d = new Date(Date.UTC(y!, m!, 1));
                setMonthAnchor(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
                setSelectedDay(null);
              }}
              className="rounded-full border border-white/10 px-3 py-1 active:bg-white/5"
            >
              <Text className="font-mono text-xs text-muted">→</Text>
            </Pressable>
          </View>
          <MonthGrid
            days={days}
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
        scheduleEntries.length === 0 ? (
          <EmptyPanel
            icon={CalendarDays}
            title="Nothing upcoming"
            hint="No airings in the next 60 days."
          />
        ) : (
          <View>
            {scheduleEntries.map((entry) => (
              <View key={`${entry.episodeId}-${entry.airDate}`}>
                <Text className="px-4 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {entry.airStamp
                    ? entry.airStamp.slice(0, 16).replace("T", " ")
                    : entry.airDate}
                </Text>
                {renderEntry(entry)}
              </View>
            ))}
          </View>
        )
      ) : null}

      {mode === "timeline" ? (
        days.length === 0 ? (
          <EmptyPanel
            icon={CalendarDays}
            title="No airings"
            hint="Nothing in this window — refresh metadata or try Month / Schedule."
          />
        ) : (
          days.map((day) => (
            <View key={day.date} className="mb-5">
              <SectionHeader label={day.date} count={day.entries.length} />
              <View className="mt-2">{day.entries.map(renderEntry)}</View>
            </View>
          ))
        )
      ) : null}
    </PullToRefresh>
  );
}
