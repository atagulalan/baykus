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
  AccordionPanel,
  AddSectionBar,
  animateLayoutToggle,
  CATEGORY_ICONS,
  EMPTY_PANEL_CTA_CLASS,
  EmptyPanel,
  type LibrarySort,
  SectionHeader,
  type StickySection,
  StickySectionScroll,
  skeletonCategoryStickySections,
} from "@baykus/ui";
import { useFocusEffect } from "@react-navigation/native";
import { Link, router } from "expo-router";
import { Library, LogIn } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider.tsx";
import { stickySectionTop, tabContentBottom } from "../../src/chrome/layout.ts";
import { MenuSeriesCard, SeriesCardMenuProvider } from "../../src/components/SeriesCardMenu.tsx";
import { groupByCategory } from "../../src/lib/groupByCategory.ts";
import { sectionSort, sortsForCategory } from "../../src/lib/sectionSort.ts";
import { seriesGridCols } from "../../src/lib/seriesGridCols.ts";
import { sortSeriesSummaries } from "../../src/lib/sortSeries.ts";
import { maybeStartSweep } from "../../src/lib/staleSweep.ts";
import { ensurePinnedWatchSections, resolveUiPrefs } from "../../src/lib/uiPrefs.ts";

/** Library home — BrowsePage grid parity (`/`). List lives on Watch. */
export default function LibraryScreen() {
  const { t } = useTranslation();
  const { session, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = seriesGridCols(width);
  const [items, setItems] = useState<SeriesSummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Partial<Record<WatchCategory, boolean>>>({});

  const needsAuth = session?.mode === "multi" && !session.authenticated;
  const prefs = useMemo(() => resolveUiPrefs(settings), [settings]);
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
    }
  }, [needsAuth]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void load();
  }, [authLoading, load]);

  // Tabs stay mounted — refetch when returning from series detail after watch mutations.
  useFocusEffect(
    useCallback(() => {
      if (authLoading || needsAuth) return;
      void load();
    }, [authLoading, needsAuth, load]),
  );

  useEffect(() => {
    if (authLoading || needsAuth || loading) return;
    maybeStartSweep({ onComplete: () => void load() });
  }, [authLoading, needsAuth, loading, load]);

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

  if (authLoading) {
    return (
      <StickySectionScroll
        className="flex-1 bg-void"
        contentContainerClassName="px-1.5"
        contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
        stickyOffset={stickySectionTop(insets.top)}
        pinClassName="px-1.5"
        sections={skeletonCategoryStickySections(cols)}
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

  const listHeaderParts: ReactNode[] = [];
  if (error) {
    listHeaderParts.push(
      <Text key="error" className="mb-4 px-1 font-mono text-xs text-red-400">
        {error}
      </Text>,
    );
  }

  let stickySections: StickySection[] = [];
  let listFooter: ReactNode = null;

  if (loading) {
    stickySections = skeletonCategoryStickySections(cols);
  } else if (items.length === 0) {
    stickySections = [
      {
        key: "empty",
        body: (
          <EmptyPanel
            icon={Library}
            title="No series yet"
            hint="Add shows from search or import a zip."
          />
        ),
      },
    ];
  } else if (grouped.length === 0) {
    stickySections = [
      {
        key: "all-done",
        body: (
          <EmptyPanel
            icon={Library}
            title={t("library.empty.allDoneTitle", { defaultValue: "All caught up" })}
            hint={t("library.empty.allDoneHint", {
              defaultValue: "Add more sections below, or browse your full library.",
            })}
            action={
              <Link href="/library/all" asChild>
                <Pressable accessibilityRole="link" className={EMPTY_PANEL_CTA_CLASS}>
                  <Text className="font-mono text-[10px] uppercase tracking-widest text-void">
                    {t("profile.allSeries")}
                  </Text>
                </Pressable>
              </Link>
            }
          />
        ),
      },
    ];
  } else {
    stickySections = grouped.map((section) => {
      const isCollapsed = collapsed[section.category] === true;
      return {
        key: section.category,
        renderHeader: () => (
          <SectionHeader
            className="mb-0"
            icon={CATEGORY_ICONS[section.category]}
            label={t(`category.${section.category}`, {
              defaultValue: section.category.replaceAll("_", " "),
            })}
            count={section.items.length}
            expanded={!isCollapsed}
            onPress={() => {
              animateLayoutToggle();
              setCollapsed((prev) => ({
                ...prev,
                [section.category]: !prev[section.category],
              }));
            }}
          />
        ),
        body: (
          <AccordionPanel open={!isCollapsed} className={isCollapsed ? "mb-1" : "mb-6 mt-2"}>
            <View className="flex-row flex-wrap">
              {section.items.map((item) => (
                <View key={item.id} style={{ width: `${100 / cols}%` }}>
                  <MenuSeriesCard
                    item={item}
                    onPress={() => router.push(`/series/${seriesParam(item)}`)}
                  />
                </View>
              ))}
            </View>
          </AccordionPanel>
        ),
      };
    });
  }

  if (items.length > 0) {
    listFooter = (
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
    <SeriesCardMenuProvider
      onSeriesPatched={(updated) => {
        setItems((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      }}
      onSeriesRemoved={(id) => {
        setItems((prev) => prev.filter((s) => s.id !== id));
      }}
      onReload={() => {
        void load();
      }}
      onError={(message) => setError(message)}
    >
      <StickySectionScroll
        className="flex-1 bg-void"
        contentContainerClassName="px-1.5"
        contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
        stickyOffset={stickySectionTop(insets.top)}
        pinClassName="px-1.5"
        sections={stickySections}
        listHeader={listHeaderParts.length > 0 ? listHeaderParts : null}
        listFooter={listFooter}
        variant="history"
        historyLabel={t("watch.showHistory", { defaultValue: "Show history" })}
        onOpen={() => {
          router.push("/watch/history");
        }}
      />
    </SeriesCardMenuProvider>
  );
}
