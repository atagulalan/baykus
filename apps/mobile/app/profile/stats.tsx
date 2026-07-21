import {
  ApiError,
  CATEGORY_ORDER,
  getStats,
  type Stats,
  type WatchCategory,
} from "@baykus/api-client";
import {
  colors,
  EmptyPanel,
  HBarList,
  Heatmap,
  MiniBars,
  PullToRefresh,
  SectionPill,
  SkeletonStatsPage,
  StatTile,
} from "@baykus/ui";
import { Stack } from "expo-router";
import { BarChart3, RefreshCw } from "lucide-react-native";
import { Children, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { tabContentBottom, tabContentTop } from "../../src/chrome/layout.ts";
import { formatDurationLabel, formatDurationParts } from "../../src/lib/duration.ts";

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const FUN_ACTIVITIES = [
  { id: "walkAroundWorld", minutes: 480000 },
  { id: "shower", minutes: 15 },
  { id: "outerWilds", minutes: 22 },
  { id: "lotr", minutes: 683 },
  { id: "moonFlight", minutes: 4320 },
  { id: "mountEverest", minutes: 57600 },
] as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Horizontal page pad — matches ScrollView `paddingHorizontal: 12`. */
const PAGE_PAD_X = 12;
/** Inner hero/block inset (`px-1`). */
const INNER_PAD_X = 4;

/**
 * Equal-width tile grid (web `grid grid-cols-*`).
 * Pixel widths — `%` + `gap` overflowed and wrapped into a staggered layout.
 */
function StatTileGrid({
  cols,
  gap,
  pageWidth,
  children,
}: {
  cols: number;
  gap: number;
  pageWidth: number;
  children: ReactNode;
}) {
  const innerW = pageWidth - PAGE_PAD_X * 2 - INNER_PAD_X * 2;
  const tileW = cols <= 1 ? innerW : (innerW - gap * (cols - 1)) / cols;
  return (
    <View className="flex-row flex-wrap" style={{ gap }}>
      {Children.map(children, (child) =>
        child == null ? null : <View style={{ width: tileW }}>{child}</View>,
      )}
    </View>
  );
}

/** Visual parity with web StatsPage — hero + tiles + SectionPill + HBar/MiniBars. */
export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityIndex, setActivityIndex] = useState(() =>
    Math.floor(Math.random() * FUN_ACTIVITIES.length),
  );

  const needsAuth = session?.mode === "multi" && !session.authenticated;
  const tileCols = width >= 720 ? 3 : 2;
  /** Web RecentSection: `grid-cols-1 sm:grid-cols-3`. */
  const recentCols = width >= 640 ? 3 : 1;

  const load = useCallback(async () => {
    if (needsAuth) {
      setStats(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setStats(await getStats(deviceTimeZone()));
    } catch (err) {
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

  const currentActivity = FUN_ACTIVITIES[activityIndex] ?? FUN_ACTIVITIES[0];
  const activityLine = useMemo(() => {
    if (!stats) return "";
    const activityTimes = stats.watchTimeMin / currentActivity.minutes;
    const formattedCount = new Intl.NumberFormat(i18n.language || "tr-TR", {
      maximumFractionDigits: activityTimes >= 100 ? 0 : 2,
    }).format(activityTimes);
    return t(`stats.hero.activities.${currentActivity.id}`, { count: formattedCount });
  }, [stats, currentActivity, i18n.language, t]);

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <PullToRefresh
        className="flex-1 bg-void"
        contentContainerStyle={{
          paddingBottom: tabContentBottom(insets.bottom),
          paddingTop: tabContentTop(insets.top),
          paddingHorizontal: PAGE_PAD_X,
          gap: 40,
        }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
        }}
      >
        {authLoading || loading ? (
          <SkeletonStatsPage contentWidth={width - PAGE_PAD_X * 2} />
        ) : needsAuth ? (
          <EmptyPanel icon={BarChart3} title="Sign in required" hint="Stats need a session." />
        ) : error ? (
          <View className="items-center gap-3 py-16">
            <Text className="font-mono text-xs text-muted">{t("errors.generic")}</Text>
            <Text className="font-mono text-xs text-red-400">{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                void load();
              }}
              className="rounded-md border border-white/10 px-3 py-1.5"
            >
              <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t("errors.retry")}
              </Text>
            </Pressable>
          </View>
        ) : !stats ? null : (
          <>
            <View className="gap-8 px-1">
              <View className="items-center gap-2 py-4">
                <Text className="text-center font-display text-6xl italic leading-none tracking-tight text-snow">
                  {formatDurationLabel(formatDurationParts(stats.watchTimeMin), t)}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="font-mono text-xs uppercase tracking-widest text-muted">
                    {activityLine}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("stats.hero.activities.next")}
                    onPress={() => setActivityIndex((prev) => (prev + 1) % FUN_ACTIVITIES.length)}
                    className="rounded-full p-1 active:bg-white/5"
                  >
                    <RefreshCw size={14} color={colors.muted} />
                  </Pressable>
                </View>
              </View>

              <StatTileGrid cols={tileCols} gap={16} pageWidth={width}>
                {(
                  [
                    [t("stats.tiles.tracked"), stats.seriesCount],
                    [t("stats.tiles.episodes"), stats.episodesWatched],
                    [t("stats.tiles.favorites"), stats.favoritesCount],
                    [t("stats.tiles.watching"), stats.itemCount.watching],
                    [t("stats.tiles.finished"), stats.itemCount.finished],
                    [t("stats.tiles.watchLater"), stats.itemCount.watch_later],
                  ] as const
                ).map(([label, value]) => (
                  <StatTile
                    key={label}
                    className="w-full"
                    label={label}
                    value={value.toLocaleString("tr-TR")}
                  />
                ))}
              </StatTileGrid>

              {stats.episodesWatched === 0 ? (
                <Text className="text-center font-mono text-sm text-muted">{t("stats.empty")}</Text>
              ) : null}
            </View>

            {stats.episodesWatched > 0 ? (
              <>
                <StatsBlock title={t("stats.recent.title")}>
                  <StatTileGrid cols={recentCols} gap={16} pageWidth={width}>
                    <StatTile
                      className="w-full"
                      label={t("stats.recent.last7Days")}
                      value={formatDurationLabel(
                        formatDurationParts(stats.recent.last7Days.watchTimeMin),
                        t,
                      )}
                      sub={`${stats.recent.last7Days.episodes} ep`}
                    />
                    <StatTile
                      className="w-full"
                      label={t("stats.recent.last30Days")}
                      value={formatDurationLabel(
                        formatDurationParts(stats.recent.last30Days.watchTimeMin),
                        t,
                      )}
                      sub={`${stats.recent.last30Days.episodes} ep`}
                    />
                    <StatTile
                      className="w-full"
                      label={t("stats.recent.thisMonth")}
                      value={formatDurationLabel(
                        formatDurationParts(stats.recent.thisMonth.watchTimeMin),
                        t,
                      )}
                      sub={`${stats.recent.thisMonth.episodes} ep`}
                    />
                  </StatTileGrid>
                </StatsBlock>

                {stats.mostWatchedByTime.length > 0 ? (
                  <StatsBlock title={t("stats.mostWatchedByTime.title")}>
                    <HBarList
                      items={stats.mostWatchedByTime.slice(0, 10).map((row) => ({
                        key: String(row.itemId),
                        label: row.title,
                        value: row.watchTimeMin,
                        displayValue: formatDurationLabel(formatDurationParts(row.watchTimeMin), t),
                      }))}
                    />
                  </StatsBlock>
                ) : null}

                <StatsBlock title={t("stats.categoryStatus.title")}>
                  <HBarList
                    items={CATEGORY_ORDER.filter((c) => (stats.itemCount[c] ?? 0) > 0).map(
                      (c: WatchCategory) => ({
                        key: c,
                        label: t(`category.${c}`),
                        value: stats.itemCount[c],
                        displayValue: String(stats.itemCount[c]),
                      }),
                    )}
                  />
                </StatsBlock>

                <StatsBlock title={t("stats.ratingDistribution")}>
                  <HBarList
                    items={[
                      {
                        key: "1",
                        label: t("rating.bad"),
                        value: stats.ratingDistribution["1"],
                        displayValue: String(stats.ratingDistribution["1"]),
                      },
                      {
                        key: "2",
                        label: t("rating.okay"),
                        value: stats.ratingDistribution["2"],
                        displayValue: String(stats.ratingDistribution["2"]),
                      },
                      {
                        key: "3",
                        label: t("rating.good"),
                        value: stats.ratingDistribution["3"],
                        displayValue: String(stats.ratingDistribution["3"]),
                      },
                    ]}
                  />
                </StatsBlock>

                {stats.genreDistribution.top.length > 0 ? (
                  <StatsBlock title={t("stats.genreDistribution.title")}>
                    <HBarList
                      items={[
                        ...stats.genreDistribution.top.map((row) => ({
                          key: row.name,
                          label: row.name,
                          value: row.episodes,
                          displayValue: String(row.episodes),
                        })),
                        ...(stats.genreDistribution.other > 0
                          ? [
                              {
                                key: "other",
                                label: t("stats.distribution.other"),
                                value: stats.genreDistribution.other,
                                displayValue: String(stats.genreDistribution.other),
                                muted: true,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </StatsBlock>
                ) : null}

                {stats.networkDistribution.top.length > 0 ? (
                  <StatsBlock title={t("stats.networkDistribution.title")}>
                    <StatTile
                      className="mb-3"
                      label={t("stats.networkDistribution.networkCount")}
                      value={String(stats.networkDistribution.networkCount)}
                    />
                    <HBarList
                      items={[
                        ...stats.networkDistribution.top.map((row) => ({
                          key: row.name,
                          label: row.name,
                          value: row.episodes,
                          displayValue: String(row.episodes),
                        })),
                        ...(stats.networkDistribution.other > 0
                          ? [
                              {
                                key: "other",
                                label: t("stats.distribution.other"),
                                value: stats.networkDistribution.other,
                                displayValue: String(stats.networkDistribution.other),
                                muted: true,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </StatsBlock>
                ) : null}

                <StatsBlock title={t("stats.backlog.title")}>
                  <StatTileGrid cols={2} gap={16} pageWidth={width}>
                    <StatTile
                      className="w-full"
                      label={t("stats.backlog.episodes")}
                      value={String(stats.backlog.episodes)}
                      sub={`${stats.backlog.seriesCount} series`}
                    />
                    <StatTile
                      className="w-full"
                      label={t("stats.backlog.remainingTime")}
                      value={formatDurationLabel(
                        formatDurationParts(stats.backlog.watchTimeMin),
                        t,
                      )}
                    />
                  </StatTileGrid>
                  <HBarList
                    className="mt-3"
                    items={stats.backlog.topSeries.slice(0, 8).map((row) => ({
                      key: String(row.itemId),
                      label: row.title,
                      value: row.episodes,
                      displayValue: String(row.episodes),
                    }))}
                  />
                </StatsBlock>

                {stats.pace ? (
                  <StatsBlock title={t("stats.pace.title")}>
                    <StatTileGrid cols={2} gap={16} pageWidth={width}>
                      <StatTile
                        className="w-full"
                        label={t("stats.pace.projectionLabel")}
                        value={t("stats.pace.projection", {
                          count: stats.pace.projectedWeeks,
                          weeks: stats.pace.projectedWeeks,
                        })}
                      />
                      <StatTile
                        className="w-full"
                        label={t("stats.pace.label")}
                        value={t("stats.pace.value", {
                          count: Math.round(stats.pace.episodesPerWeek),
                        })}
                        sub={t("stats.pace.sub")}
                      />
                    </StatTileGrid>
                  </StatsBlock>
                ) : null}

                {stats.upcoming.months.length > 0 ? (
                  <StatsBlock title={t("stats.upcoming.title")}>
                    <MiniBars
                      items={stats.upcoming.months.map((row) => ({
                        key: row.month,
                        label: row.month.slice(5),
                        value: row.episodes,
                        tooltip: `${row.month}: ${row.episodes}`,
                      }))}
                    />
                  </StatsBlock>
                ) : null}

                {stats.binges.length > 0 ? (
                  <StatsBlock title={t("stats.binges.title")}>
                    <HBarList
                      items={stats.binges.slice(0, 10).map((row) => ({
                        key: `${row.itemId}-${row.date}`,
                        label: row.title,
                        value: row.episodes,
                        displayValue: `${row.episodes} · ${row.date}`,
                      }))}
                    />
                  </StatsBlock>
                ) : null}

                <StatsBlock title={t("stats.rewatchSummary.title")}>
                  <StatTileGrid cols={2} gap={16} pageWidth={width}>
                    <StatTile
                      className="w-full"
                      label={t("stats.rewatchSummary.total")}
                      value={String(stats.rewatchSummary.totalRewatches)}
                    />
                    <StatTile
                      className="w-full"
                      label={t("stats.rewatchSummary.episodes")}
                      value={String(stats.rewatchSummary.rewatchedEpisodes)}
                    />
                  </StatTileGrid>
                  <HBarList
                    className="mt-3"
                    items={stats.rewatchSummary.bySeries.slice(0, 8).map((row) => ({
                      key: String(row.itemId),
                      label: row.title,
                      value: row.rewatches,
                      displayValue: String(row.rewatches),
                    }))}
                  />
                </StatsBlock>

                <StatsBlock title={t("stats.streaks.title")}>
                  <StatTileGrid cols={2} gap={16} pageWidth={width}>
                    <StatTile
                      className="w-full"
                      label={t("stats.streaks.longest")}
                      value={String(stats.streaks.longestWeeks)}
                    />
                    <StatTile
                      className="w-full"
                      label={t("stats.streaks.current")}
                      value={String(stats.streaks.currentWeeks)}
                    />
                  </StatTileGrid>
                  <HBarList
                    className="mt-3"
                    items={stats.streaks.bySeries.slice(0, 8).map((row) => ({
                      key: String(row.itemId),
                      label: row.title,
                      value: row.weeks,
                      displayValue: `${row.weeks}w`,
                    }))}
                  />
                </StatsBlock>

                {stats.timeByYear.length > 0 ? (
                  <StatsBlock title={t("stats.yearlyTime.title")}>
                    <MiniBars
                      items={stats.timeByYear.map((row) => ({
                        key: String(row.year),
                        label: String(row.year),
                        value: row.totalMin,
                        tooltip: formatDurationLabel(formatDurationParts(row.totalMin), t),
                      }))}
                    />
                  </StatsBlock>
                ) : null}

                {stats.timeByYear.length > 0 ? (
                  <StatsBlock title={t("stats.activityHeatmap.title")}>
                    {stats.activityByDay.length === 0 ? (
                      <View className="h-32 items-center justify-center rounded-md border border-white/10 bg-white/5">
                        <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                          {t("stats.empty")}
                        </Text>
                      </View>
                    ) : (
                      <Heatmap
                        years={[...stats.timeByYear.map((y) => y.year)].sort((a, b) => a - b)}
                        days={stats.activityByDay}
                        ariaLabel={t("stats.activityHeatmap.title")}
                      />
                    )}
                    <View className="mt-2 flex-row items-center justify-end gap-1.5">
                      <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        {t("stats.activityHeatmap.legendLow")}
                      </Text>
                      <View className="h-[11px] w-[11px] bg-white/5" />
                      <View className="h-[11px] w-[11px] bg-yellow/25" />
                      <View className="h-[11px] w-[11px] bg-yellow/55" />
                      <View className="h-[11px] w-[11px] bg-yellow/90" />
                      <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        {t("stats.activityHeatmap.legendHigh")}
                      </Text>
                    </View>
                  </StatsBlock>
                ) : null}

                <StatsBlock title={t("stats.byWeekday.title")}>
                  <MiniBars
                    items={WEEKDAYS.map((label, i) => ({
                      key: label,
                      label,
                      value: stats.byWeekday[i] ?? 0,
                      tooltip: `${label}: ${stats.byWeekday[i] ?? 0}`,
                    }))}
                  />
                </StatsBlock>

                <StatsBlock title={t("stats.byHour.title")}>
                  <MiniBars
                    labelEvery={3}
                    items={Array.from({ length: 24 }, (_, hour) => ({
                      key: `h-${hour}`,
                      label: String(hour),
                      value: stats.byHour[hour] ?? 0,
                      tooltip: `${hour}:00 — ${stats.byHour[hour] ?? 0}`,
                    }))}
                  />
                </StatsBlock>

                {stats.datedWatches.dated < stats.datedWatches.total ? (
                  <Text className="px-1 text-center font-mono text-xs text-muted">
                    {t("stats.footer.caveat", {
                      dated: stats.datedWatches.dated,
                      total: stats.datedWatches.total,
                    })}
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </PullToRefresh>
    </>
  );
}

function StatsBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3 px-1">
      <View className="z-30 items-center py-1">
        <SectionPill>
          <Text className="px-2.5 py-1 font-sans text-sm font-semibold text-snow">{title}</Text>
        </SectionPill>
      </View>
      {children}
    </View>
  );
}
