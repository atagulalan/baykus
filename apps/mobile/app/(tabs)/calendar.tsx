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
  EmptyPanel,
  SectionHeader,
  type StickySection,
  type StickySectionScrollHandle,
  StickySectionScroll,
  skeletonCalendarStickySections,
  todayIso,
} from "@baykus/ui";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { CalendarDays, LogIn } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { stickySectionTop, tabContentBottom } from "../../src/chrome/layout.ts";
import {
  bucketNeedsDaySubheaders,
  filterGapTrackerEntries,
  groupIntoTimelineSections,
  rebucketCalendarDays,
  type TimelineBucketId,
} from "../../src/lib/calendarBuckets.ts";

/** API omits empty days — synthesize today so BUGÜN always exists for E73 pin. */
function ensureTodayPresent(
  days: Array<{ date: string; entries: CalendarEntry[] }>,
  today: string,
): Array<{ date: string; entries: CalendarEntry[] }> {
  if (days.some((d) => d.date === today)) return days;
  return [...days, { date: today, entries: [] }].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mapEntry(entry: CalendarEntry) {
  return {
    episodeId: entry.episodeId,
    itemId: entry.itemId,
    title: entry.title,
    posterUrl: buildImageUrl(entry.posterRef, "thumb"),
    s: entry.s,
    e: entry.e,
    episodeTitle: entry.episodeTitle,
    airDate: entry.airDate,
    airStamp: entry.airStamp,
    episodeType: entry.episodeType,
    seasonName: entry.seasonName,
  };
}

/** Mobile calendar — timeline only (web hides month on small viewports; schedule stays web). */
export default function CalendarScreen() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checkedOff, setCheckedOff] = useState<Set<number>>(() => new Set());
  const stickyScrollRef = useRef<StickySectionScrollHandle | null>(null);

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
      const today = todayIso();
      const res = await getCalendar({ from: addDays(today, -21), to: addDays(today, 28) });
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
  }, [needsAuth]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

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

  const timelineSections = useMemo(() => {
    const today = todayIso();
    const filtered = displayDays.map((d) => ({
      ...d,
      entries: filterGapTrackerEntries(d.entries, today).map((e) => ({
        ...e,
        isWatched: e.isWatched || checkedOff.has(e.episodeId),
      })),
    }));
    // Keep today even when empty so the BUGÜN section (and E73 pin) always exists.
    const visible = ensureTodayPresent(filtered, today).filter(
      (d) => d.entries.length > 0 || d.date === today,
    );
    return groupIntoTimelineSections(visible, today);
  }, [displayDays, checkedOff]);

  // E73: tabs stay mounted — pin BUGÜN under sticky chrome whenever Calendar
  // gains focus (and again once data finishes loading while focused).
  useFocusEffect(
    useCallback(() => {
      if (loading || authLoading || needsAuth) return;

      let cancelled = false;
      let raf1 = 0;
      let raf2 = 0;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (cancelled) return;
          stickyScrollRef.current?.pinSection("today", { animated: false, correctMs: 0 });
        });
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }, [loading, authLoading, needsAuth]),
  );

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
      <StickySectionScroll
        className="flex-1 bg-void"
        contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
        stickyOffset={stickySectionTop(insets.top)}
        sections={skeletonCalendarStickySections()}
        refreshing={false}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
        }}
      />
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

  const listHeader =
    error != null ? (
      <Text className="mb-3 px-4 font-mono text-xs text-red-400">{error}</Text>
    ) : null;

  const stickySections: StickySection[] =
    timelineSections.length === 0
      ? [
          {
            key: "empty",
            body: (
              <EmptyPanel
                icon={CalendarDays}
                title="No airings"
                hint={t("calendar.empty.suggestUpcoming", {
                  defaultValue: "Nothing in this window — refresh metadata or add more series.",
                })}
              />
            ),
          },
        ]
      : timelineSections.map((section) => ({
          key: section.bucket,
          renderHeader: () => (
            <SectionHeader
              label={bucketLabel(section.bucket)}
              count={section.days.reduce((n, d) => n + d.entries.length, 0)}
            />
          ),
          body: (
            <View className="mb-6 mt-1">
              {section.days.map((day) => (
                <View key={day.date} className="mb-3">
                  {bucketNeedsDaySubheaders(section.bucket) ? (
                    <Text className="mb-1 px-4 font-mono text-[10px] uppercase tracking-widest text-muted">
                      {day.date}
                    </Text>
                  ) : null}
                  {day.entries.length === 0 && section.bucket === "today" ? (
                    <Text className="px-4 py-6 text-center font-display italic text-base text-snow">
                      {t("calendar.empty.today")}
                    </Text>
                  ) : (
                    <View>{day.entries.map(renderEntry)}</View>
                  )}
                </View>
              ))}
            </View>
          ),
        }));

  return (
    <StickySectionScroll
      className="flex-1 bg-void"
      contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
      stickyOffset={stickySectionTop(insets.top)}
      sections={stickySections}
      listHeader={listHeader}
      scrollRef={stickyScrollRef}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
      }}
    />
  );
}
