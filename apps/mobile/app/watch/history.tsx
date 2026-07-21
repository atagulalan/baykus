import {
  ApiError,
  buildImageUrl,
  getWatchHistory,
  removeLatestEpisodeWatch,
  seriesParam,
  type WatchHistoryEntry,
} from "@baykus/api-client";
import {
  colors,
  EpisodeRow,
  PageTitleRow,
  PullToRefresh,
  SectionPill,
  SegmentedButtonGroup,
  SkeletonBone,
  todayIso,
} from "@baykus/ui";
import { router, Stack } from "expo-router";
import { LogIn } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { addDaysIso } from "../../src/lib/calendarBuckets.ts";

type HistoryOrder = "newest" | "oldest";

function yesterdayIso(): string {
  return addDaysIso(todayIso(), -1);
}

function formatHistoryDayTime(
  date: string,
  time: string,
  locale: string,
  currentYear: number,
): string {
  const watchYear = Number(date.slice(0, 4));
  const includeYear = watchYear !== currentYear;
  const datePart = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(new Date(`${date}T00:00:00Z`));
  return includeYear ? datePart : `${datePart} ${time}`;
}

export default function WatchHistoryScreen() {
  const { t, i18n } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WatchHistoryEntry[]>([]);
  const [order, setOrder] = useState<HistoryOrder>("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unwatchingId, setUnwatchingId] = useState<number | null>(null);

  const needsAuth = session?.mode === "multi" && !session.authenticated;
  const locale = i18n.language === "en" ? "en-US" : "tr-TR";

  const load = useCallback(async () => {
    if (needsAuth) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await getWatchHistory({ limit: 100, order });
      setItems(res.items);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsAuth, order]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  async function onUnwatch(episodeId: number) {
    setUnwatchingId(episodeId);
    setError(null);
    try {
      await removeLatestEpisodeWatch(episodeId);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "unwatch_failed",
      );
    } finally {
      setUnwatchingId(null);
    }
  }

  function relativeDay(entry: WatchHistoryEntry): string {
    const date = entry.watchedAt.slice(0, 10);
    const time = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(entry.watchedAt));
    if (date === todayIso()) return t("watch.relativeDay.todayAt", { time });
    if (date === yesterdayIso()) return t("watch.relativeDay.yesterdayAt", { time });
    return formatHistoryDayTime(date, time, locale, Number(todayIso().slice(0, 4)));
  }

  if (authLoading || loading) {
    return (
      <View className="flex-1 bg-void px-4 pt-4">
        <Stack.Screen options={{ title: t("watch.history") }} />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBone key={i} className="mb-2 h-14 w-full rounded-md" />
        ))}
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-void px-4">
        <Stack.Screen options={{ title: t("watch.history") }} />
        <LogIn size={28} color={colors.muted} />
        <Text className="text-sm text-muted">Sign in</Text>
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
      <Stack.Screen options={{ title: t("watch.history") }} />
      <PageTitleRow
        className="mb-3 px-4"
        action={
          <SegmentedButtonGroup
            value={order}
            onChange={setOrder}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
        }
      >
        {t("watch.history")}
      </PageTitleRow>

      <View className="mb-2 items-center px-3 py-1">
        <SectionPill>
          <Text className="font-sans text-sm font-semibold text-snow">{t("watch.history")}</Text>
        </SectionPill>
      </View>

      {error ? <Text className="mb-3 px-4 font-mono text-xs text-red-400">{error}</Text> : null}
      {items.length === 0 ? (
        <Text className="px-4 py-3 text-sm text-muted">{t("watch.empty.history")}</Text>
      ) : (
        items.map((item) => (
          <EpisodeRow
            key={item.watchId}
            embedded
            posterStretch
            seriesTitle={item.title}
            stillUrl={buildImageUrl(item.posterRef, "thumb")}
            s={item.s}
            e={item.e}
            episodeTitle={item.episodeTitle}
            watched
            onToggleWatch={() => {
              void onUnwatch(item.episodeId);
            }}
            checkboxDisabled={unwatchingId === item.episodeId}
            onPress={() => router.push(`/series/${seriesParam({ id: item.itemId, tmdbId: null })}`)}
            trailing={<Text className="shrink-0 text-xs text-muted">{relativeDay(item)}</Text>}
          />
        ))
      )}
    </PullToRefresh>
  );
}
