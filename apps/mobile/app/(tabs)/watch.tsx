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
  animateLayoutToggle,
  CATEGORY_ICONS,
  EmptyPanel,
  type LibrarySort,
  SectionHeader,
  type StickySection,
  StickySectionScroll,
  skeletonWatchStickySections,
  WatchNextRow,
  type WatchNextSeries,
} from "@baykus/ui";
import { router } from "expo-router";
import { Clapperboard, LogIn } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { stickySectionTop, tabContentBottom } from "../../src/chrome/layout.ts";
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

  const showNeedsReview = useMemo(() => {
    const needsReviewItems = byCategory.get("needs_review") ?? [];
    return needsReviewItems.some((s) => s.nextUnwatched != null);
  }, [byCategory]);

  const sectionsToRender = useMemo((): WatchCategory[] => {
    return showNeedsReview ? ["needs_review", ...sections] : [...sections];
  }, [showNeedsReview, sections]);

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

  const quickMark = useCallback(
    async (episodeId: number) => {
      setMarkingId(episodeId);
      try {
        await addEpisodeWatch(episodeId);
        await load();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "watch_failed",
        );
      } finally {
        setMarkingId(null);
      }
    },
    [load],
  );

  const onOpenSeries = useCallback((item: SeriesSummary) => {
    router.push(`/series/${seriesParam(item)}`);
  }, []);

  const toggleCollapsed = useCallback((category: WatchCategory) => {
    animateLayoutToggle();
    setCollapsed((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const stickySections: StickySection<SeriesSummary>[] = useMemo(() => {
    if (items.length === 0) {
      return [
        {
          key: "empty",
          body: (
            <EmptyPanel
              icon={Clapperboard}
              title="Nothing to watch"
              hint="Add series to your library — next episodes show up here."
            />
          ),
        },
      ];
    }
    if (grouped.length === 0) {
      return [
        {
          key: "all-done",
          body: (
            <EmptyPanel
              icon={Clapperboard}
              title={t("library.empty.allDoneTitle", { defaultValue: "All caught up" })}
              hint={t("library.empty.allDoneHint", {
                defaultValue: "Add more sections below, or browse your full library.",
              })}
            />
          ),
        },
      ];
    }
    return grouped.map((section) => {
      const isCollapsed = collapsed[section.category] === true;
      return {
        key: section.category,
        renderHeader: () => (
          <SectionHeader
            className="px-4"
            icon={CATEGORY_ICONS[section.category]}
            label={t(`category.${section.category}`, {
              defaultValue: section.category.replaceAll("_", " "),
            })}
            count={section.items.length}
            expanded={!isCollapsed}
            onPress={() => {
              toggleCollapsed(section.category);
            }}
          />
        ),
        data: isCollapsed ? [] : section.items,
        keyExtractor: (item: SeriesSummary) => String(item.id),
        rowsClassName: isCollapsed ? "mb-1" : "mb-6",
        renderItem: ({ item, index }: { item: SeriesSummary; index: number }) => (
          <View className={index === 0 ? "mt-2" : undefined}>
            <WatchNextRow
              series={toWatchNextSeries(item)}
              marking={markingId === item.nextUnwatched?.episodeId}
              caughtUpSubtitle={item.nextAirDate ? `Next air ${item.nextAirDate}` : "Up to date"}
              onPress={() => onOpenSeries(item)}
              onQuickMark={(episodeId) => {
                void quickMark(episodeId);
              }}
            />
          </View>
        ),
      };
    });
  }, [collapsed, grouped, items.length, markingId, onOpenSeries, quickMark, t, toggleCollapsed]);

  if (authLoading || loading) {
    return (
      <StickySectionScroll
        className="flex-1 bg-void"
        contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
        stickyOffset={stickySectionTop(insets.top)}
        sections={skeletonWatchStickySections()}
        variant="history"
        historyLabel={t("watch.showHistory", { defaultValue: "Show history" })}
        onOpen={() => {
          router.push("/watch/history");
        }}
      />
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

  const listHeader =
    error != null ? (
      <Text className="mb-3 px-4 font-mono text-xs text-red-400">{error}</Text>
    ) : null;

  let listFooter: ReactNode = null;
  if (items.length > 0) {
    listFooter = (
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
          sortMenu: t("library.filter.sortTitle", { defaultValue: "Sort" }),
          categoryLabel: (c) => t(`category.${c}`, { defaultValue: c }),
          sortLabel: (s) => t(`library.sort.${s}`, { defaultValue: s }),
          remove: t("watch.removeSection", { defaultValue: "Remove" }),
          add: t("watch.addSection", { defaultValue: "Add" }),
          pinned: t("watch.sectionPinned", { defaultValue: "Pinned" }),
          reorder: (c) =>
            t("watch.reorderSection", {
              category: t(`category.${c}`, { defaultValue: c }),
              defaultValue: `Drag ${c} to reorder`,
            }),
          moveUp: t("common.moveUp", { defaultValue: "Move up" }),
          moveDown: t("common.moveDown", { defaultValue: "Move down" }),
        }}
      />
    );
  }

  return (
    <StickySectionScroll
      className="flex-1 bg-void"
      contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
      stickyOffset={stickySectionTop(insets.top)}
      sections={stickySections}
      listHeader={listHeader}
      listFooter={listFooter}
      variant="history"
      historyLabel={t("watch.showHistory", { defaultValue: "Show history" })}
      onOpen={() => {
        router.push("/watch/history");
      }}
    />
  );
}
