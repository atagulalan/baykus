import {
  ApiError,
  listSeries,
  refreshAllSeries,
  type SeriesSummary,
  seriesParam,
} from "@baykus/api-client";
import {
  colors,
  EMPTY_PANEL_CTA_CLASS,
  EmptyPanel,
  type LibrarySort,
  PageTitle,
  PullToRefresh,
  SeriesCard,
  SkeletonBone,
  SortMenu,
} from "@baykus/ui";
import { Link, router } from "expo-router";
import { Library, LogIn, RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { toSeriesCardSeries } from "../../src/lib/mapSeriesCard.ts";

const SORT_OPTIONS: Array<{ value: LibrarySort; label: string }> = [
  { value: "title", label: "Title" },
  { value: "added", label: "Added" },
  { value: "rating", label: "Rating" },
  { value: "nextAir", label: "Next air" },
  { value: "lastWatched", label: "Last watched" },
];

export default function LibraryScreen() {
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width >= 720 ? 4 : width >= 480 ? 3 : 2;
  const [sort, setSort] = useState<LibrarySort>("title");
  const [items, setItems] = useState<SeriesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metaRefreshing, setMetaRefreshing] = useState(false);
  const [metaProgress, setMetaProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsAuth = session?.mode === "multi" && !session.authenticated;

  const load = useCallback(async () => {
    if (needsAuth) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await listSeries({ sort });
      setItems(res.items);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [needsAuth, sort]);

  async function onRefreshMetadata() {
    setMetaRefreshing(true);
    setMetaProgress(null);
    setError(null);
    try {
      const result = await refreshAllSeries((event) => {
        setMetaProgress(`${event.done}/${event.total}`);
      });
      setMetaProgress(`ok ${result.ok} · fail ${result.failed} · +${result.newEpisodes} eps`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "refresh_failed",
      );
    } finally {
      setMetaRefreshing(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  if (authLoading) {
    return (
      <View className="flex-1 bg-void px-4 pt-4">
        <SkeletonBone className="mb-4 h-8 w-40" />
        <View className="flex-row flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-1/2 p-1">
              <SkeletonBone className="aspect-[2/3] w-full rounded-md" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View className="flex-1 justify-center bg-void px-2">
        <EmptyPanel
          icon={LogIn}
          title="Sign in to see your library"
          hint="Multi-mode servers require a session."
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/login")}
              className={EMPTY_PANEL_CTA_CLASS}
            >
              <Text className="font-mono text-xs uppercase tracking-widest text-void">Sign in</Text>
            </Pressable>
          }
        />
      </View>
    );
  }

  return (
    <PullToRefresh
      className="flex-1 bg-void"
      contentContainerClassName="px-3 pb-8"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
      }}
    >
      <View className="mb-4 flex-row items-center justify-between gap-2 px-1">
        <View className="min-w-0 flex-1 flex-row items-baseline gap-3">
          <PageTitle>Library</PageTitle>
          <Link href="/library/all" asChild>
            <Pressable accessibilityRole="link" className="py-1 active:opacity-80">
              <Text className="font-mono text-[10px] uppercase tracking-widest text-muted underline">
                All series
              </Text>
            </Pressable>
          </Link>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh metadata"
            disabled={metaRefreshing || needsAuth}
            onPress={() => {
              void onRefreshMetadata();
            }}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-white/5 disabled:opacity-40"
          >
            {metaRefreshing ? (
              <ActivityIndicator color={colors.yellow} size="small" />
            ) : (
              <RefreshCw size={16} color={colors.muted} />
            )}
          </Pressable>
          <SortMenu
            sort={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
            title="Sort"
            accessibilityLabel="Sort library"
          />
        </View>
      </View>

      {metaProgress ? (
        <Text className="mb-2 px-1 font-mono text-[10px] text-muted">{metaProgress}</Text>
      ) : null}

      {error ? <Text className="mb-4 px-1 font-mono text-xs text-red-400">{error}</Text> : null}

      {loading ? (
        <View className="flex-row flex-wrap">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: `${100 / cols}%` }} className="p-1.5">
              <SkeletonBone className="aspect-[2/3] w-full rounded-md" />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyPanel
          icon={Library}
          title="No series yet"
          hint="Add shows from search or import a zip."
        />
      ) : (
        <View className="flex-row flex-wrap">
          {items.map((item) => (
            <View key={item.id} style={{ width: `${100 / cols}%` }}>
              <SeriesCard
                series={toSeriesCardSeries(item)}
                onPress={() => router.push(`/series/${seriesParam(item)}`)}
              />
            </View>
          ))}
        </View>
      )}

      <Link href="/dev/smoke" className="mt-6 px-1">
        <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Brand smoke →
        </Text>
      </Link>
    </PullToRefresh>
  );
}
