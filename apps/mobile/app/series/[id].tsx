import {
  ApiError,
  addEpisodeWatch,
  buildImageUrl,
  bulkUnwatch,
  bulkWatch,
  clearRating,
  type EpisodeSummary,
  getSeriesByParam,
  getSettings,
  type ManualList,
  refreshSeries,
  removeLatestEpisodeWatch,
  removeSeries,
  type SeriesDetail,
  type Settings,
  setRating,
  updateSeries,
} from "@baykus/api-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  ActionSheet,
  type ActionSheetItem,
  alignSeasonProgressAnnounced,
  CastRail,
  CircularProgress,
  CollapsedSeasonsGap,
  ConfirmDialog,
  colors,
  EmptyPanel,
  EpisodeDetailsSheet,
  EpisodeRow,
  formatAirDateLabel,
  NeedsReviewBanner,
  NextUpCard,
  PullToRefresh,
  type RatingValue,
  SectionPill,
  SeriesDetailHero,
  SeriesDetailsSheet,
  SkeletonBone,
  isEpisodeAired as uiIsEpisodeAired,
  WatchDateSheet,
} from "@baykus/ui";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  Bell,
  BellOff,
  Bookmark,
  CircleX,
  Clapperboard,
  Heart,
  Info,
  MoreVertical,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shouldPromptEpisodeRating } from "../../src/lib/shouldPromptEpisodeRating.ts";
import {
  genreKey,
  isStale,
  languageDisplayName,
  releaseStatusLabel,
} from "../../src/lib/seriesDetailsMeta.ts";
import { resolveUiPrefs } from "../../src/lib/uiPrefs.ts";

function findNextEpisode(detail: SeriesDetail): EpisodeSummary | null {
  const next = detail.nextUnwatched;
  if (!next) return null;
  for (const season of detail.seasons) {
    const ep = season.episodes.find((e) => e.id === next.episodeId);
    if (ep) return ep;
  }
  return null;
}

function formatSeasonCount(watched: number, total: number, complete: boolean): string {
  if (watched === 0 || complete) return String(total);
  return `${watched}/${total}`;
}

type EpisodeSheetMode = "upToHere" | "watched";

export default function SeriesDetailScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyEpisode, setBusyEpisode] = useState<number | null>(null);
  const [seasonBusy, setSeasonBusy] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false);
  const [seriesDetailsOpen, setSeriesDetailsOpen] = useState(false);
  const [detailsEpisode, setDetailsEpisode] = useState<EpisodeSummary | null>(null);
  const [expandCollapsed, setExpandCollapsed] = useState(false);

  const [seasonMenu, setSeasonMenu] = useState<number | null>(null);
  const [unwatchSeasonConfirm, setUnwatchSeasonConfirm] = useState<number | null>(null);

  const [episodeSheet, setEpisodeSheet] = useState<{
    episode: EpisodeSummary;
    mode: EpisodeSheetMode;
  } | null>(null);
  const [editDateEpisode, setEditDateEpisode] = useState<EpisodeSummary | null>(null);
  const [promptEpisodeId, setPromptEpisodeId] = useState<number | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  const ratingLabels = {
    group: t("rating.label"),
    bad: t("rating.bad"),
    okay: t("rating.okay"),
    good: t("rating.good"),
  };

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [next, s] = await Promise.all([getSeriesByParam(id), getSettings()]);
      setDetail(next);
      setSettings(s);
    } catch (err) {
      setDetail(null);
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setExpandCollapsed(false);
    void load();
  }, [load]);

  function fail(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback);
  }

  async function watchOnly(episodeId: number, priorRating?: 1 | 2 | 3 | null) {
    setBusyEpisode(episodeId);
    try {
      await addEpisodeWatch(episodeId);
      await load();
      if (shouldPromptEpisodeRating(priorRating)) setPromptEpisodeId(episodeId);
    } catch (err) {
      fail(err, "watch_failed");
    } finally {
      setBusyEpisode(null);
    }
  }

  async function unwatchLatest(episodeId: number) {
    setBusyEpisode(episodeId);
    try {
      await removeLatestEpisodeWatch(episodeId);
      if (promptEpisodeId === episodeId) setPromptEpisodeId(null);
      await load();
    } catch (err) {
      fail(err, "unwatch_failed");
    } finally {
      setBusyEpisode(null);
    }
  }

  async function watchUpTo(episodeId: number) {
    if (!detail) return;
    setBusyEpisode(episodeId);
    try {
      await bulkWatch(detail.id, { upToEpisodeId: episodeId });
      await load();
    } catch (err) {
      fail(err, "bulk_failed");
    } finally {
      setBusyEpisode(null);
    }
  }

  async function rateEpisode(episodeId: number, value: RatingValue) {
    try {
      await setRating("episode", episodeId, value);
      setPromptEpisodeId(null);
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          seasons: prev.seasons.map((season) => ({
            ...season,
            episodes: season.episodes.map((ep) =>
              ep.id === episodeId ? { ...ep, myRating: value } : ep,
            ),
          })),
        };
      });
    } catch (err) {
      fail(err, "episode_rating_failed");
    }
  }

  function onEpisodeToggle(episode: EpisodeSummary) {
    if (!uiIsEpisodeAired(episode)) return;
    const next = detail?.nextUnwatched ?? null;
    const hasUnwatchedBefore =
      episode.watchCount === 0 &&
      next !== null &&
      (episode.s > next.s || (episode.s === next.s && episode.e > next.e));

    if (episode.watchCount > 0) {
      setEpisodeSheet({ episode, mode: "watched" });
      return;
    }
    if (hasUnwatchedBefore) {
      setEpisodeSheet({ episode, mode: "upToHere" });
      return;
    }
    void watchOnly(episode.id, episode.myRating);
  }

  async function onEditDateSave(iso: string) {
    if (!editDateEpisode) return;
    const ep = editDateEpisode;
    setBusyEpisode(ep.id);
    setEditDateEpisode(null);
    try {
      if (ep.watchCount > 0) await removeLatestEpisodeWatch(ep.id);
      await addEpisodeWatch(ep.id, iso);
      await load();
    } catch (err) {
      fail(err, "edit_date_failed");
    } finally {
      setBusyEpisode(null);
    }
  }

  async function markSeasonWatched(seasonNumber: number) {
    if (!detail) return;
    setSeasonBusy(true);
    try {
      await bulkWatch(detail.id, { seasonNumber });
      await load();
    } catch (err) {
      fail(err, "season_watch_failed");
    } finally {
      setSeasonBusy(false);
    }
  }

  async function unwatchSeason(seasonNumber: number) {
    if (!detail) return;
    setSeasonBusy(true);
    try {
      await bulkUnwatch(detail.id, { seasonNumber });
      await load();
    } catch (err) {
      fail(err, "season_unwatch_failed");
    } finally {
      setSeasonBusy(false);
    }
  }

  async function toggleFavorite() {
    if (!detail) return;
    setMenuBusy(true);
    try {
      const updated = await updateSeries(detail.id, { favorite: !detail.favorite });
      setDetail((prev) => (prev ? { ...prev, favorite: updated.favorite } : prev));
    } catch (err) {
      fail(err, "favorite_failed");
    } finally {
      setMenuBusy(false);
    }
  }

  async function changeManualList(manualList: ManualList | null) {
    if (!detail) return;
    setMenuBusy(true);
    try {
      const updated = await updateSeries(detail.id, { manualList });
      setDetail((prev) =>
        prev ? { ...prev, manualList: updated.manualList, category: updated.category } : prev,
      );
    } catch (err) {
      fail(err, "list_failed");
    } finally {
      setMenuBusy(false);
    }
  }

  async function toggleMute() {
    if (!detail) return;
    setMenuBusy(true);
    try {
      const updated = await updateSeries(detail.id, { pushMuted: !detail.pushMuted });
      setDetail((prev) => (prev ? { ...prev, pushMuted: updated.pushMuted } : prev));
    } catch (err) {
      fail(err, "mute_failed");
    } finally {
      setMenuBusy(false);
    }
  }

  async function onRate(value: RatingValue | null) {
    if (!detail) return;
    setRatingBusy(true);
    setError(null);
    try {
      if (value === null) await clearRating("item", detail.id);
      else await setRating("item", detail.id, value);
      setDetail((prev) => (prev ? { ...prev, rating: value } : prev));
    } catch (err) {
      fail(err, "rating_failed");
    } finally {
      setRatingBusy(false);
    }
  }

  async function onRefreshSeries() {
    if (!detail) return;
    setMenuBusy(true);
    setError(null);
    try {
      await refreshSeries(detail.id);
      await load();
    } catch (err) {
      fail(err, "refresh_failed");
    } finally {
      setMenuBusy(false);
    }
  }

  async function fillMissingSeasons() {
    if (!detail) return;
    setReviewBusy(true);
    setError(null);
    try {
      const maxStartedSeason = detail.seasonProgress.seasons.reduce(
        (max, s) => (s.watched > 0 ? Math.max(max, s.number) : max),
        0,
      );
      const promises: Promise<unknown>[] = [];
      for (const s of detail.seasonProgress.seasons) {
        if (s.number !== 0 && s.number < maxStartedSeason && s.watched < s.total) {
          promises.push(bulkWatch(detail.id, { seasonNumber: s.number }));
        }
      }
      await Promise.all(promises);
      await updateSeries(detail.id, { needsReview: false });
      await load();
    } catch (err) {
      fail(err, "fill_failed");
    } finally {
      setReviewBusy(false);
    }
  }

  async function dismissNeedsReview() {
    if (!detail) return;
    setReviewBusy(true);
    setError(null);
    try {
      await updateSeries(detail.id, { needsReview: false });
      await load();
    } catch (err) {
      fail(err, "dismiss_failed");
    } finally {
      setReviewBusy(false);
    }
  }

  async function onRemove() {
    if (!detail) return;
    try {
      await removeSeries(detail.id);
      router.back();
    } catch (err) {
      fail(err, "remove_failed");
      setRemoveOpen(false);
    }
  }

  const nextEpisode = detail ? findNextEpisode(detail) : null;
  const showNextUp = resolveUiPrefs(settings).showNextUpCarousel;

  const { collapsedCount, visibleSeasons, defaultOpen } = useMemo(() => {
    if (!detail) return { collapsedCount: 0, visibleSeasons: [], defaultOpen: "" };
    const seasons = detail.seasons;
    let completePrefix = 0;
    for (const season of seasons) {
      const allWatched =
        season.episodes.length > 0 && season.episodes.every((ep) => ep.watchCount > 0);
      if (!allWatched) break;
      completePrefix += 1;
    }
    const hideCount = !expandCollapsed && completePrefix > 1 ? Math.max(0, completePrefix - 1) : 0;
    const visible = hideCount > 0 ? seasons.slice(hideCount) : seasons;
    const openSeason =
      detail.nextUnwatched?.s != null
        ? String(detail.nextUnwatched.s)
        : visible[0]
          ? String(visible[0].number)
          : "";
    return { collapsedCount: hideCount, visibleSeasons: visible, defaultOpen: openSeason };
  }, [detail, expandCollapsed]);

  const seriesMenuItems: ActionSheetItem[] = !detail
    ? []
    : [
        {
          key: "favorite",
          label: t(detail.favorite ? "series.unfavorite" : "series.favorite"),
          icon: (
            <Heart
              size={16}
              color={detail.favorite ? colors.yellow : colors.muted}
              fill={detail.favorite ? colors.yellow : "transparent"}
            />
          ),
          onPress: () => {
            void toggleFavorite();
          },
        },
        ...(detail.manualList !== null
          ? [
              {
                key: "watching",
                label: t("category.watching"),
                icon: <Play size={16} color={colors.muted} />,
                onPress: () => {
                  void changeManualList(null);
                },
              } satisfies ActionSheetItem,
            ]
          : []),
        ...(detail.manualList !== "watch_later"
          ? [
              {
                key: "watch_later",
                label: t("manualList.watch_later"),
                icon: <Bookmark size={16} color={colors.muted} />,
                onPress: () => {
                  void changeManualList("watch_later");
                },
              } satisfies ActionSheetItem,
            ]
          : []),
        ...(detail.manualList !== "stopped" && detail.category !== "finished"
          ? [
              {
                key: "stopped",
                label: t("manualList.stopped"),
                icon: <CircleX size={16} color={colors.muted} />,
                onPress: () => {
                  void changeManualList("stopped");
                },
              } satisfies ActionSheetItem,
            ]
          : []),
        {
          key: "mute",
          label: t(detail.pushMuted ? "series.unmute" : "series.mute"),
          icon: detail.pushMuted ? (
            <BellOff size={16} color={colors.muted} />
          ) : (
            <Bell size={16} color={colors.muted} />
          ),
          onPress: () => {
            void toggleMute();
          },
        },
        {
          key: "refresh",
          label: t("series.refresh"),
          icon: <RefreshCw size={16} color={colors.muted} />,
          onPress: () => {
            void onRefreshSeries();
          },
        },
        {
          key: "remove",
          label: t("library.card.remove"),
          icon: <Trash2 size={16} color="#f87171" />,
          danger: true,
          onPress: () => setRemoveOpen(true),
        },
      ];

  if (loading && !detail) {
    return (
      <View className="flex-1 bg-void">
        <Stack.Screen
          options={{
            title: "…",
            headerTransparent: true,
            headerStyle: { backgroundColor: "transparent" },
          }}
        />
        <SkeletonBone className="mb-4 h-96 w-full" />
        <View className="px-4">
          <SkeletonBone className="mb-2 h-8 w-56" />
          <SkeletonBone className="h-4 w-full" />
        </View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View className="flex-1 bg-void">
        <Stack.Screen options={{ title: "Not found" }} />
        <EmptyPanel icon={Clapperboard} title="Series not found" hint={error ?? undefined} />
      </View>
    );
  }

  const posterUrl = buildImageUrl(detail.posterRef, "large");
  const backdropUrl = buildImageUrl(detail.backdropRef, "large");
  const heroProgress = alignSeasonProgressAnnounced(detail.seasonProgress, detail.seasons);
  const cast = detail.cast.slice(0, 12).map((c, i) => ({
    id: c.id ?? `${c.name}-${i}`,
    name: c.name,
    character: c.character ?? null,
    photoUrl: buildImageUrl(c.profileRef ?? null, "thumb"),
  }));

  const seasonForMenu =
    seasonMenu != null ? detail.seasons.find((s) => s.number === seasonMenu) : null;
  const seasonHasAiredUnwatched =
    seasonForMenu?.episodes.some((ep) => uiIsEpisodeAired(ep) && ep.watchCount === 0) ?? false;
  const seasonHasWatched = seasonForMenu?.episodes.some((ep) => ep.watchCount > 0) ?? false;

  const episodeSheetItems: ActionSheetItem[] = episodeSheet
    ? episodeSheet.mode === "upToHere"
      ? [
          {
            key: "upTo",
            label: t("episode.watchedUpToHere"),
            primary: true,
            onPress: () => {
              void watchUpTo(episodeSheet.episode.id);
            },
          },
          {
            key: "only",
            label: t("episode.markOnlyThis"),
            onPress: () => {
              void watchOnly(episodeSheet.episode.id, episodeSheet.episode.myRating);
            },
          },
        ]
      : [
          {
            key: "again",
            label: t("episode.watchAgain"),
            onPress: () => {
              void watchOnly(episodeSheet.episode.id, episodeSheet.episode.myRating);
            },
          },
          {
            key: "edit",
            label: t("episode.editDate"),
            onPress: () => setEditDateEpisode(episodeSheet.episode),
          },
          {
            key: "unwatch",
            label:
              episodeSheet.episode.watchCount > 1
                ? t("episode.removeRewatch")
                : t("episode.markAsUnwatched"),
            danger: true,
            onPress: () => {
              void unwatchLatest(episodeSheet.episode.id);
            },
          },
        ]
    : [];

  // Header sits over backdrop — keep bar transparent; title empty so hero owns the name.
  const headerPad = 44;

  return (
    <PullToRefresh
      className="flex-1 bg-void"
      contentContainerClassName="pb-10"
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        try {
          if (detail) {
            await refreshSeries(detail.id);
          }
          await load();
        } finally {
          setRefreshing(false);
        }
      }}
    >
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.snow,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("series.menu")}
              onPress={() => setSeriesMenuOpen(true)}
              className="mr-1 h-11 w-11 items-center justify-center active:opacity-70"
            >
              <MoreVertical size={18} color={colors.muted} strokeWidth={1.5} />
            </Pressable>
          ),
        }}
      />

      <View className="gap-6">
      <SeriesDetailHero
        title={detail.title}
        year={detail.year}
        posterUrl={posterUrl}
        backdropUrl={backdropUrl}
        category={detail.category}
        progress={detail.progress}
        seasonProgress={heroProgress}
        insetsTop={insets.top + headerPad}
        onPressDetails={() => setSeriesDetailsOpen(true)}
        detailsAccessibilityLabel={t("series.details.trigger", {
          defaultValue: t("series.details", { defaultValue: "Details" }),
        })}
        detailsIcon={<Info size={18} color={colors.muted} strokeWidth={1.5} />}
      />

      {error ? <Text className="px-4 font-mono text-xs text-red-400">{error}</Text> : null}

      {detail.needsReview ? (
        <NeedsReviewBanner
          title={t("series.needsReviewTitle")}
          description={t("series.needsReviewDesc")}
          fillLabel={t("series.needsReviewFill")}
          dismissLabel={t("series.needsReviewDismiss")}
          isLoading={reviewBusy}
          onFill={() => {
            void fillMissingSeasons();
          }}
          onDismiss={() => {
            void dismissNeedsReview();
          }}
        />
      ) : null}

      {showNextUp && nextEpisode ? (
        <NextUpCard
          title={t("series.nextUp")}
          episode={{
            s: nextEpisode.s,
            e: nextEpisode.e,
            episodeTitle: nextEpisode.title,
            stillUrl: buildImageUrl(nextEpisode.stillRef, "thumb"),
            watched: nextEpisode.watchCount > 0,
            muted: !uiIsEpisodeAired(nextEpisode),
            checkboxDisabled: !uiIsEpisodeAired(nextEpisode) || busyEpisode === nextEpisode.id,
            airDateLabel: nextEpisode.airDate
              ? formatAirDateLabel(nextEpisode.airDate, i18n.language)
              : null,
            episodeType: nextEpisode.episodeType,
            finaleLabel: t("episode.finale"),
            untitledLabel: t("episode.untitled", { defaultValue: "Untitled" }),
            watchCount: nextEpisode.watchCount,
            showRatingPrompt: promptEpisodeId === nextEpisode.id,
            myRating: nextEpisode.myRating,
            ratingLabels,
            skipLabel: t("rating.skip"),
          }}
          onToggleWatch={() => {
            onEpisodeToggle(nextEpisode);
          }}
          onRate={(value) => {
            void rateEpisode(nextEpisode.id, value);
          }}
          onDismissPrompt={() => setPromptEpisodeId(null)}
        />
      ) : null}

      <View>
        <CollapsedSeasonsGap
          count={collapsedCount}
          label={t("series.hiddenSeasonsWatched", { count: collapsedCount })}
          onExpand={() => setExpandCollapsed(true)}
        />
        <Accordion type="single" defaultValue={defaultOpen} collapsible>
          {visibleSeasons.map((season) => {
            const airedEpisodes = season.episodes.filter((ep) => uiIsEpisodeAired(ep));
            const airedCount = airedEpisodes.length;
            const totalCount = season.episodes.length;
            const watchedAiredCount = airedEpisodes.filter((ep) => ep.watchCount > 0).length;
            const watchedCount = season.episodes.filter((ep) => ep.watchCount > 0).length;
            const caughtUpOnAired = airedCount > 0 && watchedAiredCount >= airedCount;
            const finished = caughtUpOnAired && airedCount === totalCount;
            const caughtUpWaiting = caughtUpOnAired && !finished;
            const progressPct = airedCount === 0 ? 0 : (watchedAiredCount / airedCount) * 100;
            const hasAiredUnwatched = airedCount > 0 && !caughtUpOnAired;
            const hasWatched = watchedCount > 0;
            const seasonLabel =
              season.name ??
              (season.number === 0
                ? t("series.specials")
                : t("series.seasonNumber", { number: season.number }));
            const seasonCount =
              totalCount === 0
                ? t("episode.tbd")
                : formatSeasonCount(watchedCount, totalCount, finished);

            return (
              <AccordionItem key={season.number} value={String(season.number)}>
                <View className="items-center px-3 py-1">
                  <SectionPill>
                    <View className="flex-row items-center">
                      {hasAiredUnwatched || hasWatched ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("series.seasonMenu")}
                          onPress={() => setSeasonMenu(season.number)}
                          className="relative z-20 -ml-2.5 shrink-0 items-center justify-center p-1 active:opacity-70"
                        >
                          <CircularProgress
                            value={progressPct}
                            complete={finished}
                            caughtUp={caughtUpWaiting}
                          />
                        </Pressable>
                      ) : (
                        <View className="relative z-20 -ml-2.5 shrink-0 p-1">
                          <CircularProgress
                            value={progressPct}
                            complete={finished}
                            caughtUp={caughtUpWaiting}
                          />
                        </View>
                      )}
                      <AccordionTrigger className="relative z-0 min-w-0 flex-1 flex-row items-center gap-1.5 rounded-full -mr-2.5 -ml-4 pl-3 pr-2.5 py-1 active:bg-white/5">
                        <Text className="min-w-0 shrink font-semibold text-sm text-snow" numberOfLines={1}>
                          {seasonLabel}
                        </Text>
                        <Text className="shrink-0 text-muted/35" accessibilityElementsHidden>
                          |
                        </Text>
                        <Text className="shrink-0 font-mono text-xs tabular-nums text-muted">
                          {seasonCount}
                        </Text>
                      </AccordionTrigger>
                    </View>
                  </SectionPill>
                </View>
                <AccordionContent>
                  <View className="gap-0.5 pb-2 pt-2">
                    {season.episodes.length === 0 ? (
                      <EmptyPanel
                        className="px-3 py-6"
                        icon={Clapperboard}
                        title={t("series.seasonEmpty.title", {
                          defaultValue: t("episode.tbd"),
                        })}
                        hint={t("series.seasonEmpty.hint", {
                          defaultValue: " ",
                        })}
                      />
                    ) : (
                      season.episodes.map((ep) => (
                      <EpisodeRow
                        key={ep.id}
                        s={ep.s}
                        e={ep.e}
                        episodeTitle={ep.title}
                        stillUrl={buildImageUrl(ep.stillRef, "thumb")}
                        watched={ep.watchCount > 0}
                        watchCount={ep.watchCount}
                        muted={!uiIsEpisodeAired(ep)}
                        checkboxDisabled={busyEpisode === ep.id || !uiIsEpisodeAired(ep)}
                        showRatingPrompt={promptEpisodeId === ep.id}
                        myRating={ep.myRating}
                        ratingLabels={ratingLabels}
                        skipLabel={t("rating.skip")}
                        airDateLabel={
                          ep.airDate ? formatAirDateLabel(ep.airDate, i18n.language) : null
                        }
                        episodeType={ep.episodeType}
                        finaleLabel={t("episode.finale")}
                        untitledLabel={t("episode.untitled", { defaultValue: "Untitled" })}
                        showTags={false}
                        onRate={(value) => {
                          void rateEpisode(ep.id, value);
                        }}
                        onDismissPrompt={() => setPromptEpisodeId(null)}
                        onPress={() => setDetailsEpisode(ep)}
                        onToggleWatch={() => {
                          onEpisodeToggle(ep);
                        }}
                      />
                    ))
                    )}
                  </View>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </View>
      </View>

      <ActionSheet
        isOpen={seriesMenuOpen}
        onClose={() => setSeriesMenuOpen(false)}
        title={t("series.menu")}
        items={seriesMenuItems}
        busy={menuBusy}
      />

      <ActionSheet
        isOpen={seasonMenu != null}
        onClose={() => setSeasonMenu(null)}
        title={t("series.seasonMenu")}
        busy={seasonBusy}
        items={[
          ...(seasonHasAiredUnwatched
            ? [
                {
                  key: "mark",
                  label: t("series.markSeasonWatched"),
                  onPress: () => {
                    if (seasonMenu != null) void markSeasonWatched(seasonMenu);
                  },
                },
              ]
            : []),
          ...(seasonHasWatched
            ? [
                {
                  key: "unwatch",
                  label: t("series.unwatchSeason"),
                  danger: true,
                  onPress: () => {
                    if (seasonMenu != null) setUnwatchSeasonConfirm(seasonMenu);
                  },
                },
              ]
            : []),
        ]}
      />

      <ActionSheet
        isOpen={episodeSheet != null}
        onClose={() => setEpisodeSheet(null)}
        title={
          episodeSheet?.mode === "upToHere" ? t("episode.watchedUpToHereTitle") : t("episode.menu")
        }
        {...(episodeSheet?.mode === "upToHere"
          ? {
              description: t("episode.watchedUpToHereDesc"),
              variant: "confirm" as const,
            }
          : { variant: "list" as const })}
        items={episodeSheetItems}
      />

      <WatchDateSheet
        isOpen={editDateEpisode != null}
        onClose={() => setEditDateEpisode(null)}
        initialIso={editDateEpisode?.lastWatchedAt}
        title={t("episode.editDate")}
        hint={t("episode.editDateHint")}
        nowLabel={t("episode.datePreset.now")}
        yesterdayLabel={t("episode.datePreset.yesterday")}
        saveLabel={t("episode.save")}
        cancelLabel={t("watch.removeSectionCancel")}
        onSave={(iso) => {
          void onEditDateSave(iso);
        }}
        busy={busyEpisode != null}
      />

      <SeriesDetailsSheet
        isOpen={seriesDetailsOpen}
        onClose={() => setSeriesDetailsOpen(false)}
        labels={{
          genres: t("series.details.genres"),
          tags: t("series.details.tags"),
          info: t("series.details.info"),
          production: t("series.details.production"),
          runtime: t("series.details.runtime"),
          added: t("series.details.added"),
          refreshed: t("series.details.refreshed"),
          neverRefreshed: t("series.details.neverRefreshed"),
          stale: t("series.details.stale"),
          contentRating: t("series.details.contentRating"),
          language: t("series.details.language"),
          ratings: t("series.details.ratings"),
          yourRating: t("series.details.yourRating"),
          providers: t("series.details.providers"),
          justWatch: t("series.justwatchAttribution"),
          separator: t("common.separator"),
        }}
        detail={{
          title: detail.title,
          tagline: detail.tagline,
          overview: detail.overview,
          releaseStatus: detail.releaseStatus,
          releaseStatusLabel: releaseStatusLabel(t, detail.releaseStatus),
          genrePills: detail.genres.map((g) =>
            t(`genres.${genreKey(g.name)}`, { defaultValue: g.name }),
          ),
          tagPills: detail.tags.map((tag) => tag.name),
          networks: detail.networks.map((n) => ({
            name: n.name,
            logoUrl: buildImageUrl(n.logoRef, "thumb"),
          })),
          runtimeLabel: (() => {
            const times = detail.episodeRunTimes ?? [];
            if (times.length === 0) return null;
            const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
            return t("episode.runtimeMin", { minutes: avg });
          })(),
          addedLabel: formatAirDateLabel(detail.addedAt.slice(0, 10), i18n.language, {
            isAbsoluteDate: true,
          }),
          refreshedLabel: detail.lastRefreshedAt
            ? formatAirDateLabel(detail.lastRefreshedAt.slice(0, 10), i18n.language, {
                isAbsoluteDate: true,
              })
            : null,
          neverRefreshed: detail.lastRefreshedAt == null,
          stale: isStale(detail.lastRefreshedAt),
          contentRating:
            detail.contentRatings.find((r) => r.region === (settings?.region ?? "TR"))?.rating ??
            detail.contentRatings[0]?.rating ??
            null,
          languageLabel: detail.originalLanguage
            ? languageDisplayName(detail.originalLanguage, i18n.language)
            : null,
          externalRatings: detail.externalRatings.map((r) => ({
            source: r.source,
            display: (r.scale === 10 ? r.value : (r.value / r.scale) * 10).toFixed(1),
          })),
          myRating: detail.rating,
          providers: detail.watchProviders
            .filter((p) => p.region === (settings?.region ?? "TR"))
            .map((p) => ({
              provider: p.provider,
              region: p.region,
              logoUrl: buildImageUrl(p.logoRef, "thumb"),
            })),
        }}
        ratingLabels={ratingLabels}
        onRateChange={(value) => {
          void onRate(value);
        }}
        castSlot={
          cast.length > 0 ? (
            <CastRail className="pt-2" title={t("series.cast.title")} cast={cast} />
          ) : null
        }
      />

      <EpisodeDetailsSheet
        isOpen={detailsEpisode != null}
        onClose={() => setDetailsEpisode(null)}
        s={detailsEpisode?.s ?? 0}
        e={detailsEpisode?.e ?? 0}
        episodeTitle={detailsEpisode?.title ?? null}
        overview={detailsEpisode?.overview}
        stillUrl={detailsEpisode ? buildImageUrl(detailsEpisode.stillRef, "large") : null}
        seriesTitle={detail.title}
        airDate={detailsEpisode?.airDate}
        runtimeMin={detailsEpisode?.runtimeMin}
        watched={(detailsEpisode?.watchCount ?? 0) > 0}
        lastWatchedAt={detailsEpisode?.lastWatchedAt}
        myRating={detailsEpisode?.myRating ?? null}
        ratingLabels={ratingLabels}
        onRate={(value) => {
          if (detailsEpisode && value != null) void rateEpisode(detailsEpisode.id, value);
        }}
        onToggleWatch={
          detailsEpisode
            ? () => {
                onEpisodeToggle(detailsEpisode);
                setDetailsEpisode(null);
              }
            : undefined
        }
        toggleLabel={t("episode.markWatched", { defaultValue: "Watch actions" })}
      />

      {unwatchSeasonConfirm != null ? (
        <ConfirmDialog
          title={t("series.unwatchSeasonTitle")}
          body={t("series.unwatchSeasonWarning")}
          confirmLabel={t("series.unwatchSeasonConfirm")}
          cancelLabel={t("watch.removeSectionCancel")}
          variant="danger"
          onClose={() => setUnwatchSeasonConfirm(null)}
          onConfirm={() => {
            void unwatchSeason(unwatchSeasonConfirm);
          }}
        />
      ) : null}

      {removeOpen ? (
        <ConfirmDialog
          title={t("library.card.remove")}
          body={t("library.card.removeConfirm", { title: detail.title })}
          confirmLabel={t("library.card.remove")}
          cancelLabel={t("watch.removeSectionCancel")}
          variant="danger"
          onClose={() => setRemoveOpen(false)}
          onConfirm={() => {
            void onRemove();
          }}
        />
      ) : null}
    </PullToRefresh>
  );
}
