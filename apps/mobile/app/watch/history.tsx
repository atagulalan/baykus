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
  SectionPill,
  SkeletonEpisodeList,
  type StickySection,
  StickySectionScroll,
  todayIso,
} from "@baykus/ui";
import { router, Stack } from "expo-router";
import { ArrowUpDown, LogIn } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { useHeaderRightAction } from "../../src/chrome/HeaderActionContext.tsx";
import {
  HEADER_ACTION_CLASS,
  stickySectionTop,
  tabContentBottom,
  tabContentTop,
} from "../../src/chrome/layout.ts";
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
  const oldestFirst = order === "oldest";

  const load = useCallback(async () => {
    if (needsAuth) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await getWatchHistory({ order });
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

  const sortToggle = useMemo(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("library.filter.sortTitle")}
        accessibilityState={{ selected: oldestFirst }}
        onPress={() => setOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
        hitSlop={8}
        className={HEADER_ACTION_CLASS}
      >
        <ArrowUpDown
          size={20}
          color={oldestFirst ? colors.yellow : colors.snow}
          strokeWidth={1.75}
        />
      </Pressable>
    ),
    [oldestFirst, t],
  );
  useHeaderRightAction(needsAuth || authLoading ? null : sortToggle);

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

  if (authLoading || (loading && items.length === 0 && !error)) {
    return (
      <View className="flex-1 bg-void px-3" style={{ paddingTop: tabContentTop(insets.top) }}>
        <Stack.Screen options={{ title: "" }} />
        <PageTitleRow className="mb-3">{t("watch.history")}</PageTitleRow>
        <SkeletonEpisodeList rows={6} />
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-void px-4">
        <Stack.Screen options={{ title: "" }} />
        <LogIn size={28} color={colors.muted} />
        <Text className="text-sm text-muted">Sign in</Text>
      </View>
    );
  }

  const listHeader = (
    <View className="gap-3 px-3">
      <PageTitleRow
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("library.filter.sortTitle")}
            accessibilityState={{ selected: oldestFirst }}
            onPress={() => setOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center"
          >
            <ArrowUpDown
              size={20}
              color={oldestFirst ? colors.yellow : colors.muted}
              strokeWidth={1.75}
            />
          </Pressable>
        }
      >
        {t("watch.history")}
      </PageTitleRow>
      {error ? (
        <View className="items-center gap-2 py-8">
          <Text className="text-center text-sm text-muted">{t("errors.generic")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              void load();
            }}
            className="border border-white/10 px-3 py-1.5"
          >
            <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t("errors.retry")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const stickySections: StickySection[] =
    error != null
      ? []
      : items.length === 0
        ? [
            {
              key: "empty",
              body: (
                <Text className="px-2 py-3 text-sm text-muted">{t("watch.empty.history")}</Text>
              ),
            },
          ]
        : [
            {
              key: "history",
              renderHeader: () => (
                <View className="items-center px-2 py-1">
                  <SectionPill>
                    <Text className="px-2.5 py-1 font-sans text-sm font-semibold text-snow">
                      {t("watch.history")}
                    </Text>
                  </SectionPill>
                </View>
              ),
              body: (
                <View>
                  {items.map((item) => (
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
                      onPress={() =>
                        router.push(`/series/${seriesParam({ id: item.itemId, tmdbId: null })}`)
                      }
                      trailing={
                        <Text className="shrink-0 text-xs text-muted">{relativeDay(item)}</Text>
                      }
                    />
                  ))}
                </View>
              ),
            },
          ];

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <StickySectionScroll
        className="flex-1 bg-void"
        contentContainerStyle={{
          paddingBottom: tabContentBottom(insets.bottom),
          paddingTop: tabContentTop(insets.top),
        }}
        stickyOffset={stickySectionTop(insets.top)}
        pinClassName="px-3"
        listHeader={listHeader}
        sections={stickySections}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
        }}
      />
    </>
  );
}
