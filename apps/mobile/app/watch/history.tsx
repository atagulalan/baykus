import {
  ApiError,
  buildImageUrl,
  getWatchHistory,
  seriesParam,
  type WatchHistoryEntry,
} from "@baykus/api-client";
import {
  EmptyPanel,
  EpisodeLabel,
  MediaImage,
  PageTitle,
  PullToRefresh,
  SegmentedButtonGroup,
  SkeletonBone,
} from "@baykus/ui";
import { router, Stack } from "expo-router";
import { History, LogIn } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";

type HistoryOrder = "newest" | "oldest";

export default function WatchHistoryScreen() {
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WatchHistoryEntry[]>([]);
  const [order, setOrder] = useState<HistoryOrder>("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  if (authLoading || loading) {
    return (
      <View className="flex-1 bg-void px-4 pt-4">
        <Stack.Screen options={{ title: "History" }} />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBone key={i} className="mb-2 h-14 w-full rounded-md" />
        ))}
      </View>
    );
  }

  if (needsAuth) {
    return (
      <View className="flex-1 justify-center bg-void">
        <Stack.Screen options={{ title: "History" }} />
        <EmptyPanel icon={LogIn} title="Sign in" hint="History needs a session in multi mode." />
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
      <Stack.Screen options={{ title: "History" }} />
      <View className="mb-3 px-4">
        <PageTitle>Watch history</PageTitle>
      </View>
      <View className="mb-4 px-4">
        <SegmentedButtonGroup
          value={order}
          onChange={setOrder}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
        />
      </View>
      {error ? <Text className="mb-3 px-4 font-mono text-xs text-red-400">{error}</Text> : null}
      {items.length === 0 ? (
        <EmptyPanel icon={History} title="No watches yet" hint="Marked episodes show up here." />
      ) : (
        items.map((item) => (
          <Pressable
            key={item.watchId}
            accessibilityRole="button"
            onPress={() => router.push(`/series/${seriesParam({ id: item.itemId, tmdbId: null })}`)}
            className="flex-row items-center gap-3 border-b border-white/5 px-4 py-3 active:bg-white/5"
          >
            <View className="h-14 w-10 overflow-hidden rounded bg-white/5">
              {buildImageUrl(item.posterRef, "thumb") ? (
                <MediaImage
                  src={buildImageUrl(item.posterRef, "thumb")!}
                  accessibilityLabel={item.title}
                  wrapperClassName="h-full w-full"
                  className="h-full w-full"
                />
              ) : null}
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text numberOfLines={1} className="font-display text-sm italic text-snow">
                {item.title}
              </Text>
              <EpisodeLabel s={item.s} e={item.e} format="SxEy" className="text-muted" />
              {item.episodeTitle ? (
                <Text numberOfLines={1} className="text-xs text-snow">
                  {item.episodeTitle}
                </Text>
              ) : null}
              <Text className="font-mono text-[10px] text-muted">
                {item.watchedAt.slice(0, 16).replace("T", " ")}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </PullToRefresh>
  );
}
