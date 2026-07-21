import {
  addEpisodeWatch,
  ApiError,
  buildImageUrl,
  listSeries,
  seriesParam,
  type SeriesSummary,
} from "@baykus/api-client";
import {
  EmptyPanel,
  PageTitle,
  PullToRefresh,
  SectionHeader,
  SkeletonBone,
  WatchNextRow,
  type WatchCategory,
  type WatchNextSeries,
} from "@baykus/ui";
import { router } from "expo-router";
import { Clapperboard, LogIn } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";

const SECTION_ORDER: WatchCategory[] = [
  "needs_review",
  "watching",
  "up_to_date",
  "not_watched_recently",
  "not_started",
  "watch_later",
  "finished",
  "stopped",
];

function toWatchNextSeries(item: SeriesSummary): WatchNextSeries {
  const next = item.nextUnwatched;
  return {
    id: item.id,
    title: item.title,
    posterUrl: buildImageUrl(item.posterRef, "thumb"),
    category: item.category,
    progress: item.progress,
    seasonProgress: item.seasonProgress,
    nextAirDate: item.nextAirDate,
    nextUnwatched: next
      ? {
          episodeId: next.episodeId,
          s: next.s,
          e: next.e,
          title: next.title,
          airDate: next.airDate,
          airStamp: next.airStamp,
        }
      : null,
  };
}

export default function WatchScreen() {
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const needsAuth = session?.mode === "multi" && !session.authenticated;

  const load = useCallback(async () => {
    if (needsAuth) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await listSeries({ sort: "lastWatched" });
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
      setItems([]);
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

  const grouped = useMemo(() => {
    const map = new Map<WatchCategory, SeriesSummary[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return SECTION_ORDER.filter((c) => (map.get(c)?.length ?? 0) > 0).map((c) => ({
      category: c,
      items: map.get(c) ?? [],
    }));
  }, [items]);

  async function quickMark(episodeId: number) {
    setMarkingId(episodeId);
    try {
      await addEpisodeWatch(episodeId);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "watch_failed",
      );
    } finally {
      setMarkingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <View className="flex-1 bg-void px-4 pt-4">
        <SkeletonBone className="mb-4 h-8 w-32" />
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
          title="Sign in to watch"
          hint="Multi-mode servers require a session."
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
      <View className="mb-4 flex-row items-center justify-between px-4">
        <PageTitle>Watch</PageTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/watch/history")}
          className="rounded-full border border-white/10 px-3 py-1.5 active:bg-white/5"
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">History</Text>
        </Pressable>
      </View>

      {error ? <Text className="mb-3 px-4 font-mono text-xs text-red-400">{error}</Text> : null}

      {grouped.length === 0 ? (
        <EmptyPanel
          icon={Clapperboard}
          title="Nothing to watch"
          hint="Add series to your library — next episodes show up here."
        />
      ) : (
        grouped.map((section) => (
          <View key={section.category} className="mb-6">
            <SectionHeader
              label={section.category.replaceAll("_", " ")}
              count={section.items.length}
            />
            <View className="mt-2">
              {section.items.map((item) => (
                <WatchNextRow
                  key={item.id}
                  series={toWatchNextSeries(item)}
                  marking={markingId === item.nextUnwatched?.episodeId}
                  caughtUpSubtitle={
                    item.nextAirDate ? `Next air ${item.nextAirDate}` : "Up to date"
                  }
                  onPress={() => router.push(`/series/${seriesParam(item)}`)}
                  onQuickMark={(episodeId) => {
                    void quickMark(episodeId);
                  }}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </PullToRefresh>
  );
}
