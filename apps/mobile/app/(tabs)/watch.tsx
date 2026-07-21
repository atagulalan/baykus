import {
  ApiError,
  addEpisodeWatch,
  buildImageUrl,
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
  EmptyPanel,
  type LibrarySort,
  PageTitle,
  PullToRefresh,
  SectionHeader,
  SkeletonBone,
  WatchNextRow,
  type WatchNextSeries,
} from "@baykus/ui";
import { router } from "expo-router";
import { Clapperboard, LogIn } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { sectionSort, sortsForCategory } from "../../src/lib/sectionSort.ts";
import { sortSeriesSummaries } from "../../src/lib/sortSeries.ts";
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

/** Browse / Watch list — section prefs + sorts mirror web BrowsePage list mode. */
export default function WatchScreen() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SeriesSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
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
      const [res, s] = await Promise.all([listSeries({ sort: "lastWatched" }), getSettings()]);
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
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  const prefs = useMemo(() => resolveUiPrefs(settings), [settings]);
  const sections = prefs.watchSections as WatchCategory[];
  const sectionSorts = useMemo(() => {
    return prefs.watchSectionSorts as Partial<Record<WatchCategory, LibrarySort>>;
  }, [prefs.watchSectionSorts]);

  const byCategory = useMemo(() => {
    const map = new Map<WatchCategory, SeriesSummary[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

  const needsReviewItems = byCategory.get("needs_review") ?? [];
  const showNeedsReview = needsReviewItems.some((s) => s.nextUnwatched != null);
  const sectionsToRender: WatchCategory[] = showNeedsReview
    ? ["needs_review", ...sections]
    : [...sections];

  const grouped = useMemo(() => {
    return sectionsToRender
      .map((category) => {
        const raw = byCategory.get(category) ?? [];
        const sort = sectionSort(sectionSorts, category);
        return {
          category,
          items: sortSeriesSummaries(raw, sort),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [sectionsToRender, byCategory, sectionSorts]);

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

  async function onSectionsChange(next: WatchCategory[]) {
    await persistPrefs({
      ...prefs,
      watchSections: ensurePinnedWatchSections(next),
    });
  }

  async function onSortChange(category: WatchCategory, sort: LibrarySort) {
    await persistPrefs({
      ...prefs,
      watchSectionSorts: { ...prefs.watchSectionSorts, [category]: sort },
    });
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
        <PageTitle>{t("watch.title", { defaultValue: "Watch" })}</PageTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/watch/history")}
          className="rounded-full border border-white/10 px-3 py-1.5 active:bg-white/5"
        >
          <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t("watch.history", { defaultValue: "History" })}
          </Text>
        </Pressable>
      </View>

      {error ? <Text className="mb-3 px-4 font-mono text-xs text-red-400">{error}</Text> : null}

      {items.length === 0 ? (
        <EmptyPanel
          icon={Clapperboard}
          title="Nothing to watch"
          hint="Add series to your library — next episodes show up here."
        />
      ) : grouped.length === 0 ? (
        <EmptyPanel
          icon={Clapperboard}
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
            void onSectionsChange(next);
          }}
          onSortChange={(category, sort) => {
            void onSortChange(category, sort);
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
