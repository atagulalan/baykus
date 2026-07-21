import {
  ApiError,
  CATEGORY_ORDER,
  getStats,
  type Stats,
  type WatchCategory,
} from "@baykus/api-client";
import { EmptyPanel, PageTitle, PullToRefresh, SkeletonBone } from "@baykus/ui";
import { Stack } from "expo-router";
import { BarChart3 } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Full stats hub — mirrors web StatsPage sections (list/row UI; heatmap as intensity strip). */
export default function StatsScreen() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsAuth = session?.mode === "multi" && !session.authenticated;

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

  return (
    <>
      <Stack.Screen options={{ title: t("app.nav.stats") }} />
      <PullToRefresh
        className="flex-1 bg-void"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
          paddingTop: 8,
          paddingHorizontal: 12,
        }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
        }}
      >
        <PageTitle className="mb-4 px-1">{t("app.nav.stats")}</PageTitle>

        {authLoading || loading ? (
          <View className="gap-3 px-1">
            <SkeletonBone className="h-24 w-full rounded-xl" />
            <SkeletonBone className="h-20 w-full rounded-xl" />
            <SkeletonBone className="h-32 w-full rounded-xl" />
          </View>
        ) : needsAuth ? (
          <EmptyPanel icon={BarChart3} title="Sign in required" hint="Stats need a session." />
        ) : error ? (
          <View className="items-center gap-3 py-16">
            <Text className="font-mono text-xs text-red-400">{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                void load();
              }}
              className="rounded-full border border-white/15 px-4 py-2"
            >
              <Text className="font-mono text-[10px] uppercase tracking-widest text-snow">
                Retry
              </Text>
            </Pressable>
          </View>
        ) : !stats || stats.episodesWatched === 0 ? (
          <EmptyPanel icon={BarChart3} title={t("stats.empty")} />
        ) : (
          <View className="gap-6 px-1">
            <View className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
              <Text className="font-display text-3xl italic text-snow">
                {formatMinutes(stats.watchTimeMin)}
              </Text>
              <Text className="mt-1 font-mono text-xs text-muted">
                {t("stats.hero.subline", {
                  episodes: stats.episodesWatched,
                  series: stats.seriesCount,
                })}
              </Text>
              <Text className="mt-2 font-mono text-[10px] text-muted">
                Favorites {stats.favoritesCount} · Dated watches {stats.datedWatches.dated}/
                {stats.datedWatches.total}
              </Text>
            </View>

            <Section title="Recent">
              <StatRow
                label="Last 7 days"
                value={`${stats.recent.last7Days.episodes} · ${formatMinutes(stats.recent.last7Days.watchTimeMin)}`}
              />
              <StatRow
                label="Last 30 days"
                value={`${stats.recent.last30Days.episodes} · ${formatMinutes(stats.recent.last30Days.watchTimeMin)}`}
              />
              <StatRow
                label="This month"
                value={`${stats.recent.thisMonth.episodes} · ${formatMinutes(stats.recent.thisMonth.watchTimeMin)}`}
              />
            </Section>

            {stats.mostWatchedByTime.length > 0 ? (
              <Section title="Most watched">
                {stats.mostWatchedByTime.slice(0, 10).map((row) => (
                  <StatRow
                    key={row.itemId}
                    label={row.title}
                    value={formatMinutes(row.watchTimeMin)}
                  />
                ))}
              </Section>
            ) : null}

            <Section title="By category">
              {CATEGORY_ORDER.filter((c) => (stats.itemCount[c] ?? 0) > 0).map(
                (c: WatchCategory) => (
                  <StatRow key={c} label={t(`category.${c}`)} value={String(stats.itemCount[c])} />
                ),
              )}
            </Section>

            <Section title="Ratings">
              <StatRow label={t("rating.bad")} value={String(stats.ratingDistribution["1"])} />
              <StatRow label={t("rating.okay")} value={String(stats.ratingDistribution["2"])} />
              <StatRow label={t("rating.good")} value={String(stats.ratingDistribution["3"])} />
            </Section>

            {stats.episodesPerMonth.length > 0 ? (
              <Section title="Episodes per month">
                {stats.episodesPerMonth.slice(-12).map((row) => (
                  <StatRow key={row.month} label={row.month} value={String(row.count)} />
                ))}
              </Section>
            ) : null}

            {stats.favoriteProgress.length > 0 ? (
              <Section title="Favorite progress">
                {stats.favoriteProgress.slice(0, 10).map((row) => (
                  <StatRow
                    key={row.itemId}
                    label={row.title}
                    value={`${row.watchedEpisodes}/${row.airedEpisodes}`}
                  />
                ))}
              </Section>
            ) : null}

            <Section title="Production">
              <StatRow label="Ongoing" value={String(stats.production.ongoing)} />
              <StatRow label="Ended" value={String(stats.production.ended)} />
              {stats.production.ongoingItems.slice(0, 8).map((row) => (
                <StatRow
                  key={row.itemId}
                  label={row.title}
                  value={`${row.watchedEpisodes}/${row.airedEpisodes}`}
                />
              ))}
            </Section>

            {(stats.genreDistribution.top.length > 0 || stats.genreDistribution.other > 0) && (
              <Section title="Genres">
                {stats.genreDistribution.top.map((row) => (
                  <StatRow key={row.name} label={row.name} value={String(row.episodes)} />
                ))}
                {stats.genreDistribution.other > 0 ? (
                  <StatRow label="Other" value={String(stats.genreDistribution.other)} />
                ) : null}
              </Section>
            )}

            {(stats.networkDistribution.top.length > 0 || stats.networkDistribution.other > 0) && (
              <Section title={`Networks (${stats.networkDistribution.networkCount})`}>
                {stats.networkDistribution.top.map((row) => (
                  <StatRow key={row.name} label={row.name} value={String(row.episodes)} />
                ))}
                {stats.networkDistribution.other > 0 ? (
                  <StatRow label="Other" value={String(stats.networkDistribution.other)} />
                ) : null}
              </Section>
            )}

            <Section title="Backlog">
              <StatRow label="Episodes" value={String(stats.backlog.episodes)} />
              <StatRow label="Series" value={String(stats.backlog.seriesCount)} />
              <StatRow label="Time" value={formatMinutes(stats.backlog.watchTimeMin)} />
              {stats.backlog.topSeries.slice(0, 8).map((row) => (
                <StatRow key={row.itemId} label={row.title} value={`${row.episodes} ep`} />
              ))}
            </Section>

            {stats.pace ? (
              <Section title="Pace">
                <StatRow label="Episodes / week" value={stats.pace.episodesPerWeek.toFixed(1)} />
                <StatRow label="Projected weeks" value={String(stats.pace.projectedWeeks)} />
              </Section>
            ) : null}

            {stats.upcoming.months.length > 0 ? (
              <Section title="Upcoming">
                {stats.upcoming.months.map((row) => (
                  <StatRow
                    key={row.month}
                    label={row.month}
                    value={`${row.episodes} · ${formatMinutes(row.watchTimeMin)}`}
                  />
                ))}
              </Section>
            ) : null}

            {stats.binges.length > 0 ? (
              <Section title="Binges">
                {stats.binges.slice(0, 10).map((row) => (
                  <StatRow
                    key={`${row.itemId}-${row.date}`}
                    label={`${row.title} · ${row.date}`}
                    value={`${row.episodes} ep`}
                  />
                ))}
              </Section>
            ) : null}

            <Section title="Rewatches">
              <StatRow
                label="Total rewatches"
                value={String(stats.rewatchSummary.totalRewatches)}
              />
              <StatRow
                label="Rewatched episodes"
                value={String(stats.rewatchSummary.rewatchedEpisodes)}
              />
              {stats.rewatchSummary.bySeries.slice(0, 8).map((row) => (
                <StatRow key={row.itemId} label={row.title} value={String(row.rewatches)} />
              ))}
              {stats.mostRewatched.slice(0, 5).map((row) => (
                <StatRow
                  key={row.episodeId}
                  label={`${row.itemTitle} S${row.s}E${row.e}`}
                  value={`×${row.watchCount}`}
                />
              ))}
            </Section>

            <Section title="Streaks">
              <StatRow label="Longest (weeks)" value={String(stats.streaks.longestWeeks)} />
              <StatRow label="Current (weeks)" value={String(stats.streaks.currentWeeks)} />
              {stats.streaks.bySeries.slice(0, 8).map((row) => (
                <StatRow key={row.itemId} label={row.title} value={`${row.weeks}w`} />
              ))}
            </Section>

            {stats.timeByYear.length > 0 ? (
              <Section title="Time by year">
                {stats.timeByYear.map((row) => (
                  <StatRow
                    key={row.year}
                    label={String(row.year)}
                    value={formatMinutes(row.totalMin)}
                  />
                ))}
              </Section>
            ) : null}

            {stats.activityByDay.length > 0 ? (
              <Section title="Activity (recent days)">
                <ActivityStrip days={stats.activityByDay.slice(-90)} />
              </Section>
            ) : null}

            <Section title="By weekday">
              {WEEKDAYS.map((label, i) => (
                <BarRow
                  key={label}
                  label={label}
                  value={stats.byWeekday[i] ?? 0}
                  max={Math.max(...stats.byWeekday, 1)}
                />
              ))}
            </Section>

            <Section title="By hour">
              {HOURS.filter((hour) => (stats.byHour[hour] ?? 0) > 0).map((hour) => (
                <BarRow
                  key={`hour-${hour}`}
                  label={`${String(hour).padStart(2, "0")}:00`}
                  value={stats.byHour[hour] ?? 0}
                  max={Math.max(...stats.byHour, 1)}
                />
              ))}
            </Section>
          </View>
        )}
      </PullToRefresh>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">{title}</Text>
      <View className="overflow-hidden rounded-xl border border-white/10">{children}</View>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-white/5 px-3 py-3">
      <Text className="min-w-0 flex-1 text-sm text-snow" numberOfLines={1}>
        {label}
      </Text>
      <Text className="font-mono text-xs tabular-nums text-muted">{value}</Text>
    </View>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(4, Math.round((value / max) * 100));
  return (
    <View className="gap-1 border-b border-white/5 px-3 py-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[10px] text-muted">{label}</Text>
        <Text className="font-mono text-[10px] tabular-nums text-muted">{value}</Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <View className="h-full rounded-full bg-yellow" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}

function ActivityStrip({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <View className="flex-row flex-wrap gap-0.5 px-3 py-3">
      {days.map((d) => {
        const intensity = d.count === 0 ? 0.08 : 0.2 + (d.count / max) * 0.8;
        return (
          <View
            key={d.date}
            accessibilityLabel={`${d.date}: ${d.count}`}
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: `rgba(255, 214, 10, ${intensity})` }}
          />
        );
      })}
    </View>
  );
}
