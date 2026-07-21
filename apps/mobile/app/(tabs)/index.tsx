import {
  ApiError,
  addEpisodeWatch,
  buildImageUrl,
  CATEGORY_ORDER,
  getSettings,
  listSeries,
  refreshAllSeries,
  type SeriesSummary,
  type Settings,
  seriesParam,
  updateSettings,
  type WatchCategory,
} from "@baykus/api-client";
import {
  AddSectionBar,
  colors,
  EMPTY_PANEL_CTA_CLASS,
  EmptyPanel,
  type LibrarySort,
  PageTitle,
  PullToRefresh,
  SectionHeader,
  SeriesCard,
  SkeletonBone,
  WatchNextRow,
  type WatchNextSeries,
} from "@baykus/ui";
import { Link, router } from "expo-router";
import { LayoutGrid, Library, List, LogIn, RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { groupByCategory } from "../../src/lib/groupByCategory.ts";
import { toSeriesCardSeries } from "../../src/lib/mapSeriesCard.ts";
import { sectionSort, sortsForCategory } from "../../src/lib/sectionSort.ts";
import { sortSeriesSummaries } from "../../src/lib/sortSeries.ts";
import { maybeStartSweep } from "../../src/lib/staleSweep.ts";
import { ensurePinnedWatchSections, resolveUiPrefs } from "../../src/lib/uiPrefs.ts";

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

/** Library home — BrowsePage grid/list parity with watchSections prefs. */
export default function LibraryScreen() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width >= 720 ? 4 : width >= 480 ? 3 : 2;
  const [items, setItems] = useState<SeriesSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metaRefreshing, setMetaRefreshing] = useState(false);
  const [metaProgress, setMetaProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Partial<Record<WatchCategory, boolean>>>({});

  const needsAuth = session?.mode === "multi" && !session.authenticated;
  const prefs = useMemo(() => resolveUiPrefs(settings), [settings]);
  const isGrid = prefs.browseView !== "list";
  const sections = prefs.watchSections as WatchCategory[];
  const sectionSorts = prefs.watchSectionSorts as Partial<Record<WatchCategory, LibrarySort>>;

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
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed";
      setError(msg);
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

  useEffect(() => {
    if (authLoading || needsAuth || loading) return;
    if (!isGrid) return;
    maybeStartSweep({ onComplete: () => void load() });
  }, [authLoading, needsAuth, loading, isGrid, load]);

  const byCategory = useMemo(() => groupByCategory(items), [items]);
  const needsReviewItems = byCategory.get("needs_review") ?? [];
  const showNeedsReview = needsReviewItems.some((s) => s.nextUnwatched != null);
  const sectionsToRender: WatchCategory[] = showNeedsReview
    ? ["needs_review", ...sections]
    : [...sections];

  const grouped = useMemo(
    () =>
      sectionsToRender
        .map((category) => ({
          category,
          items: sortSeriesSummaries(
            byCategory.get(category) ?? [],
            sectionSort(sectionSorts, category),
          ),
        }))
        .filter((s) => s.items.length > 0),
    [sectionsToRender, byCategory, sectionSorts],
  );

  async function persistPrefs(next: typeof prefs) {
    try {
      const s = await updateSettings({ uiPrefs: next });
      setSettings(s);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "prefs_failed",
      );
    }
  }

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
          <PageTitle>{isGrid ? t("app.nav.library") : t("watch.title")}</PageTitle>
          <Link href="/library/all" asChild>
            <Pressable accessibilityRole="link" className="py-1 active:opacity-80">
              <Text className="font-mono text-[10px] uppercase tracking-widest text-muted underline">
                {t("profile.allSeries")}
              </Text>
            </Pressable>
          </Link>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh metadata"
            disabled={metaRefreshing}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isGrid ? t("library.view.list") : t("library.view.grid")}
            onPress={() => {
              void persistPrefs({ ...prefs, browseView: isGrid ? "list" : "grid" });
            }}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-white/5"
          >
            {isGrid ? (
              <List size={18} color={colors.muted} strokeWidth={1.5} />
            ) : (
              <LayoutGrid size={18} color={colors.muted} strokeWidth={1.5} />
            )}
          </Pressable>
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
      ) : grouped.length === 0 ? (
        <EmptyPanel
          icon={Library}
          title={t("library.empty.allDoneTitle", { defaultValue: "All caught up" })}
          hint={t("library.empty.allDoneHint", {
            defaultValue: "Add more sections below, or browse your full library.",
          })}
        />
      ) : (
        grouped.map((section) => {
          const isCollapsed = collapsed[section.category] === true;
          return (
            <View key={section.category} className="mb-6">
              <SectionHeader
                label={t(`category.${section.category}`, {
                  defaultValue: section.category.replaceAll("_", " "),
                })}
                count={section.items.length}
                expanded={!isCollapsed}
                onPress={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [section.category]: !prev[section.category],
                  }))
                }
              />
              {!isCollapsed ? (
                isGrid ? (
                  <View className="mt-2 flex-row flex-wrap">
                    {section.items.map((item) => (
                      <View key={item.id} style={{ width: `${100 / cols}%` }}>
                        <SeriesCard
                          series={toSeriesCardSeries(item)}
                          onPress={() => router.push(`/series/${seriesParam(item)}`)}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
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
                )
              ) : null}
            </View>
          );
        })
      )}

      {items.length > 0 ? (
        <AddSectionBar
          sections={sections}
          sectionSorts={sectionSorts}
          onSectionsChange={(next) => {
            void persistPrefs({
              ...prefs,
              watchSections: ensurePinnedWatchSections(next),
            });
          }}
          onSortChange={(category, sort) => {
            void persistPrefs({
              ...prefs,
              watchSectionSorts: { ...prefs.watchSectionSorts, [category]: sort },
            });
          }}
          sortsForCategory={sortsForCategory}
          categoryOrder={CATEGORY_ORDER}
          labels={{
            trigger: t("watch.manageSections", { defaultValue: "Manage sections" }),
            title: t("watch.manageSectionsTitle", { defaultValue: "Sections" }),
            hint: t("watch.manageSectionsHint", {
              defaultValue: "Reorder, sort, add or remove category sections.",
            }),
            categoryLabel: (c) => t(`category.${c}`, { defaultValue: c }),
            sortLabel: (s) => t(`library.sort.${s}`, { defaultValue: s }),
            remove: t("watch.removeSection", { defaultValue: "Remove" }),
            add: t("watch.addSection", { defaultValue: "Add" }),
            pinned: t("watch.sectionPinned", { defaultValue: "Pinned" }),
            moveUp: t("common.moveUp", { defaultValue: "Move up" }),
            moveDown: t("common.moveDown", { defaultValue: "Move down" }),
          }}
        />
      ) : null}
    </PullToRefresh>
  );
}
