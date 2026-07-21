import {
  ApiError,
  CATEGORY_ORDER,
  getSettings,
  listSeries,
  type SeriesSummary,
  type Settings,
  seriesParam,
  updateSettings,
  type WatchCategory,
} from "@baykus/api-client";
import {
  AddSectionBar,
  EMPTY_PANEL_CTA_CLASS,
  EmptyPanel,
  type LibrarySort,
  PageTitle,
  PullToRefresh,
  SectionHeader,
  SeriesCard,
  SkeletonBone,
} from "@baykus/ui";
import { Link, router, Stack } from "expo-router";
import { Library } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { groupByCategory } from "../../src/lib/groupByCategory.ts";
import { toSeriesCardSeries } from "../../src/lib/mapSeriesCard.ts";
import { sectionSort, sortsForCategory } from "../../src/lib/sectionSort.ts";
import { sortSeriesSummaries } from "../../src/lib/sortSeries.ts";
import { resolveUiPrefs } from "../../src/lib/uiPrefs.ts";

/** E60: full category-ordered library browse (web AllSeriesPage parity + per-section sort). */
export default function AllSeriesScreen() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width >= 720 ? 4 : width >= 480 ? 3 : 2;
  const [items, setItems] = useState<SeriesSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Partial<Record<WatchCategory, boolean>>>({});

  const needsAuth = session?.mode === "multi" && !session.authenticated;

  const load = useCallback(async () => {
    if (needsAuth) {
      setItems([]);
      setSettings(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [res, s] = await Promise.all([listSeries(), getSettings()]);
      setItems(res.items);
      setSettings(s);
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
    setLoading(true);
    void load();
  }, [load]);

  const prefs = useMemo(() => resolveUiPrefs(settings), [settings]);
  const sectionSorts = useMemo(() => {
    const raw = prefs.watchSectionSorts as Partial<Record<WatchCategory, LibrarySort>>;
    return raw;
  }, [prefs.watchSectionSorts]);

  const byCategory = useMemo(() => groupByCategory(items), [items]);
  const sections = useMemo(
    () => CATEGORY_ORDER.filter((c) => (byCategory.get(c)?.length ?? 0) > 0),
    [byCategory],
  );

  async function onSortChange(category: WatchCategory, sort: LibrarySort) {
    const nextPrefs = {
      ...prefs,
      watchSectionSorts: { ...prefs.watchSectionSorts, [category]: sort },
    };
    try {
      const s = await updateSettings({ uiPrefs: nextPrefs });
      setSettings(s);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "sort_failed",
      );
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("profile.allSeries") }} />
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
        <View className="mb-2 flex-row items-baseline gap-2 px-1">
          <PageTitle>{t("profile.allSeries")}</PageTitle>
          {items.length > 0 ? (
            <Text className="font-sans text-lg text-muted">({items.length})</Text>
          ) : null}
        </View>

        {authLoading || loading ? (
          <View className="gap-3 px-1">
            <SkeletonBone className="h-8 w-40 rounded" />
            <SkeletonBone className="h-40 w-full rounded-lg" />
            <SkeletonBone className="h-40 w-full rounded-lg" />
          </View>
        ) : needsAuth ? (
          <EmptyPanel
            icon={Library}
            title="Sign in required"
            hint="Multi-mode libraries need a session."
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
        ) : items.length === 0 ? (
          <EmptyPanel
            icon={Library}
            title={t("library.empty.title")}
            action={
              <Link href="/(tabs)/search" asChild>
                <Pressable className={EMPTY_PANEL_CTA_CLASS}>
                  <Text className="font-mono text-[10px] uppercase tracking-widest text-void">
                    {t("calendar.empty.suggestAdd")}
                  </Text>
                </Pressable>
              </Link>
            }
          />
        ) : (
          <View className="gap-8">
            {sections.length > 0 ? (
              <AddSectionBar
                sortOnly
                sections={sections}
                sectionSorts={sectionSorts}
                onSortChange={(category, sort) => {
                  void onSortChange(category, sort);
                }}
                sortsForCategory={sortsForCategory}
                labels={{
                  trigger: t("library.filter.sortTitle"),
                  title: t("library.filter.sortTitle"),
                  categoryLabel: (c) => t(`category.${c}`),
                  sortLabel: (s) => t(`library.sort.${s}`),
                  remove: "",
                  add: "",
                  pinned: "",
                  moveUp: "",
                  moveDown: "",
                }}
                className="mb-2 px-1"
              />
            ) : null}
            {sections.map((category) => {
              const raw = byCategory.get(category) ?? [];
              const sort = sectionSort(sectionSorts, category);
              const list = sortSeriesSummaries(raw, sort);
              const expanded = !collapsed[category];
              return (
                <View key={category}>
                  <SectionHeader
                    label={t(`category.${category}`)}
                    count={list.length}
                    expanded={expanded}
                    onPress={() =>
                      setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))
                    }
                  />
                  {expanded ? (
                    <View className="mt-2 flex-row flex-wrap">
                      {list.map((item) => (
                        <View key={item.id} style={{ width: `${100 / cols}%` }}>
                          <SeriesCard
                            series={toSeriesCardSeries(item)}
                            onPress={() => router.push(`/series/${seriesParam(item)}`)}
                          />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </PullToRefresh>
    </>
  );
}
