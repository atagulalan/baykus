import { ApiError, listSeries, type SeriesSummary, seriesParam } from "@baykus/api-client";
import {
  EMPTY_PANEL_CTA_CLASS,
  EmptyPanel,
  PageTitle,
  PullToRefresh,
  SeriesCard,
  SkeletonBone,
} from "@baykus/ui";
import { Link, router, Stack } from "expo-router";
import { Heart } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { toSeriesCardSeries } from "../../src/lib/mapSeriesCard.ts";

/** Full favorites grid (profile hub caps preview at 6 — E79). */
export default function FavoritesScreen() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width >= 720 ? 4 : width >= 480 ? 3 : 2;
  const [items, setItems] = useState<SeriesSummary[]>([]);
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
      const res = await listSeries({ sort: "lastWatched" });
      setItems(res.items.filter((item) => item.favorite));
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

  return (
    <>
      <Stack.Screen options={{ title: t("profile.favorites.title") }} />
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
        <View className="mb-4 flex-row items-baseline gap-2 px-1">
          <PageTitle>{t("profile.favorites.title")}</PageTitle>
          {items.length > 0 ? (
            <Text className="font-sans text-lg text-muted">({items.length})</Text>
          ) : null}
        </View>

        {authLoading || loading ? (
          <View className="flex-row flex-wrap">
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: `${100 / cols}%` }} className="p-1">
                <SkeletonBone className="aspect-[2/3] w-full rounded-md" />
              </View>
            ))}
          </View>
        ) : needsAuth ? (
          <EmptyPanel
            icon={Heart}
            title="Sign in required"
            action={
              <Link href="/login" asChild>
                <Pressable className={EMPTY_PANEL_CTA_CLASS}>
                  <Text className="font-mono text-[10px] uppercase tracking-widest text-void">
                    Sign in
                  </Text>
                </Pressable>
              </Link>
            }
          />
        ) : error ? (
          <Text className="px-1 font-mono text-xs text-red-400">{error}</Text>
        ) : items.length === 0 ? (
          <EmptyPanel
            icon={Heart}
            title={t("profile.favorites.emptyTitle")}
            hint={t("profile.favorites.empty")}
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
      </PullToRefresh>
    </>
  );
}
