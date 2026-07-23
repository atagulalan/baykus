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
  updateSettings,
} from "@baykus/api-client";
import {
  AccordionPanel,
  ActionSheet,
  type ActionSheetItem,
  alignSeasonProgressAnnounced,
  autoAdvanceIfSeasonJustCompleted,
  CastRail,
  CircularProgress,
  CollapsedSeasonsGap,
  ConfirmDialog,
  collapseCompletedSeasonRuns,
  colors,
  defaultExpandedSeasonNumber,
  EmptyPanel,
  EpisodeDetailsSheet,
  EpisodeRow,
  formatAirDateLabel,
  isSeasonComplete,
  NeedsReviewBanner,
  NextUpCard,
  type RatingValue,
  SEASON_PROGRESS_SIZE,
  SectionHeader,
  SeriesDetailHero,
  SeriesDetailsSheet,
  SkeletonSeriesDetailHero,
  type StickySection,
  StickySectionScroll,
  type StickySectionScrollHandle,
  seasonCompleteSnapshot,
  sortSeasonsSpecialsLast,
  todayIso,
  UnairedTrailingMark,
  type UnairedTrailingMarkLabels,
  isEpisodeAired as uiIsEpisodeAired,
  unairedTrailingState,
  useAiringClock,
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
  ImageIcon,
  Info,
  MoreVertical,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBannerEdgeScrub } from "../../src/chrome/EdgeScrubContext.tsx";
import { useHeaderRightAction } from "../../src/chrome/HeaderActionContext.tsx";
import {
  HEADER_ACTION_CLASS,
  stickySectionTop,
  tabContentBottom,
  WORDMARK_ROW_H,
} from "../../src/chrome/layout.ts";
import {
  genreKey,
  isStale,
  languageDisplayName,
  releaseStatusLabel,
} from "../../src/lib/seriesDetailsMeta.ts";
import { shouldPromptEpisodeRating } from "../../src/lib/shouldPromptEpisodeRating.ts";
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

function useUnairedTrailingMark(
  airDate: string | null,
  airStamp: string | null | undefined,
  watched: boolean,
  labels: UnairedTrailingMarkLabels,
) {
  const needsClock = !watched && (airStamp != null || (airDate != null && airDate > todayIso()));
  const now = useAiringClock(airDate, airStamp, needsClock);
  const state = unairedTrailingState(airDate, undefined, airStamp, now);
  const showMark = !watched && state.kind !== "none";
  return {
    showMark,
    trailing: showMark ? <UnairedTrailingMark state={state} labels={labels} /> : undefined,
  };
}

type RatingLabels = {
  group: string;
  bad: string;
  okay: string;
  good: string;
};

function SeasonRingMenuButton({
  progressPct,
  finished,
  caughtUpWaiting,
  accessibilityLabel,
  onOpen,
}: {
  progressPct: number;
  finished: boolean;
  caughtUpWaiting: boolean;
  accessibilityLabel: string;
  onOpen: (anchor: View | null) => void;
}) {
  const ringRef = useRef<View>(null);
  return (
    <Pressable
      ref={ringRef}
      collapsable={false}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => onOpen(ringRef.current)}
      className="h-full w-full items-center justify-center rounded-full active:bg-white/10"
    >
      <CircularProgress
        size={SEASON_PROGRESS_SIZE}
        value={progressPct}
        complete={finished}
        caughtUp={caughtUpWaiting}
      />
    </Pressable>
  );
}

function SeriesDetailEpisodeRow({
  ep,
  locale,
  busy,
  promptOpen,
  ratingLabels,
  countdownLabels,
  finaleLabel,
  untitledLabel,
  skipLabel,
  onRate,
  onDismissPrompt,
  onPress,
  onToggleWatch,
}: {
  ep: EpisodeSummary;
  locale: string;
  busy: boolean;
  promptOpen: boolean;
  ratingLabels: RatingLabels;
  countdownLabels: UnairedTrailingMarkLabels;
  finaleLabel: string;
  untitledLabel: string;
  skipLabel: string;
  onRate: (value: RatingValue) => void;
  onDismissPrompt: () => void;
  onPress: () => void;
  onToggleWatch: (watchControl: View | null) => void;
}) {
  const watchControlRef = useRef<View>(null);
  const watched = ep.watchCount > 0;
  const { showMark, trailing } = useUnairedTrailingMark(
    ep.airDate,
    ep.airStamp,
    watched,
    countdownLabels,
  );
  return (
    <EpisodeRow
      s={ep.s}
      e={ep.e}
      episodeTitle={ep.title}
      stillUrl={buildImageUrl(ep.stillRef, "thumb")}
      watched={watched}
      watchCount={ep.watchCount}
      muted={!uiIsEpisodeAired(ep)}
      checkboxDisabled={busy || !uiIsEpisodeAired(ep)}
      showRatingPrompt={promptOpen}
      myRating={ep.myRating}
      ratingLabels={ratingLabels}
      skipLabel={skipLabel}
      airDateLabel={ep.airDate ? formatAirDateLabel(ep.airDate, locale) : null}
      episodeType={ep.episodeType}
      finaleLabel={finaleLabel}
      untitledLabel={untitledLabel}
      showTags={false}
      trailing={trailing}
      watchControlRef={watchControlRef}
      onRate={onRate}
      onDismissPrompt={onDismissPrompt}
      onPress={onPress}
      onToggleWatch={
        showMark
          ? undefined
          : () => {
              onToggleWatch(watchControlRef.current);
            }
      }
    />
  );
}

function SeriesDetailNextUp({
  episode,
  locale,
  title,
  busy,
  promptOpen,
  ratingLabels,
  countdownLabels,
  finaleLabel,
  untitledLabel,
  skipLabel,
  onToggleWatch,
  onPress,
  onRate,
  onDismissPrompt,
}: {
  episode: EpisodeSummary;
  locale: string;
  title: string;
  busy: boolean;
  promptOpen: boolean;
  ratingLabels: RatingLabels;
  countdownLabels: UnairedTrailingMarkLabels;
  finaleLabel: string;
  untitledLabel: string;
  skipLabel: string;
  onToggleWatch: (watchControl: View | null) => void;
  onPress: () => void;
  onRate: (value: RatingValue) => void;
  onDismissPrompt: () => void;
}) {
  const watchControlRef = useRef<View>(null);
  const watched = episode.watchCount > 0;
  const { showMark, trailing } = useUnairedTrailingMark(
    episode.airDate,
    episode.airStamp,
    watched,
    countdownLabels,
  );
  return (
    <NextUpCard
      title={title}
      episode={{
        s: episode.s,
        e: episode.e,
        episodeTitle: episode.title,
        stillUrl: buildImageUrl(episode.stillRef, "thumb"),
        watched,
        muted: !uiIsEpisodeAired(episode),
        checkboxDisabled: !uiIsEpisodeAired(episode) || busy,
        airDateLabel: episode.airDate ? formatAirDateLabel(episode.airDate, locale) : null,
        episodeType: episode.episodeType,
        finaleLabel,
        untitledLabel,
        watchCount: episode.watchCount,
        showRatingPrompt: promptOpen,
        myRating: episode.myRating,
        ratingLabels,
        skipLabel,
        trailing,
      }}
      watchControlRef={watchControlRef}
      onPress={onPress}
      onToggleWatch={
        showMark
          ? undefined
          : () => {
              onToggleWatch(watchControlRef.current);
            }
      }
      onRate={onRate}
      onDismissPrompt={onDismissPrompt}
    />
  );
}

type EpisodeSheetMode = "upToHere" | "watched";

export default function SeriesDetailScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  // Keep full top scrub so header actions stay readable over the banner.
  const bannerScrub = useBannerEdgeScrub(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyEpisode, setBusyEpisode] = useState<number | null>(null);
  const [seasonBusy, setSeasonBusy] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [, setRatingBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false);
  const [seriesDetailsOpen, setSeriesDetailsOpen] = useState(false);
  const [detailsEpisode, setDetailsEpisode] = useState<EpisodeSummary | null>(null);
  const [expandedSeasonGaps, setExpandedSeasonGaps] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [openSeason, setOpenSeason] = useState<string>("");
  const openSeasonRef = useRef(openSeason);
  openSeasonRef.current = openSeason;
  const prevSeasonCompleteRef = useRef<Map<number, boolean>>(new Map());
  const stickyScrollRef = useRef<StickySectionScrollHandle>(null);
  const seriesMenuAnchorRef = useRef<View>(null);
  const seasonMenuAnchorRef = useRef<View | null>(null);
  const episodeMenuAnchorRef = useRef<View | null>(null);

  const [seasonMenu, setSeasonMenu] = useState<number | null>(null);
  const [unwatchSeasonConfirm, setUnwatchSeasonConfirm] = useState<number | null>(null);
  // iOS: a second RN Modal must not mount while another is still dismissing.
  // Queue follow-up overlays until the source ActionSheet's onExitComplete.
  const pendingUnwatchSeasonRef = useRef<number | null>(null);
  const pendingRemoveRef = useRef(false);
  const pendingEditDateRef = useRef<EpisodeSummary | null>(null);

  const [episodeSheet, setEpisodeSheet] = useState<{
    episode: EpisodeSummary;
    mode: EpisodeSheetMode;
  } | null>(null);
  const [editDateEpisode, setEditDateEpisode] = useState<EpisodeSummary | null>(null);
  const [promptEpisodeId, setPromptEpisodeId] = useState<number | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  const pinSeasonSection = useCallback((seasonNumber: number) => {
    // Instant AccordionPanel expand — pin after one layout frame (no tween wait,
    // no multi-frame correctMs storm). `animated: true` scrolls the dock smoothly.
    requestAnimationFrame(() => {
      stickyScrollRef.current?.pinSection(`season-${seasonNumber}`, {
        animated: true,
        correctMs: 0,
      });
    });
  }, []);

  const openSeriesMenu = useCallback(() => {
    pendingRemoveRef.current = false;
    setSeriesMenuOpen(true);
  }, []);
  const seriesMenuTrigger = useMemo(
    () => (
      <Pressable
        ref={seriesMenuAnchorRef}
        accessibilityRole="button"
        accessibilityLabel={t("series.menu")}
        onPress={openSeriesMenu}
        hitSlop={8}
        className={HEADER_ACTION_CLASS}
      >
        <MoreVertical size={20} color={colors.snow} strokeWidth={1.5} />
      </Pressable>
    ),
    [t, openSeriesMenu],
  );
  useHeaderRightAction(seriesMenuTrigger);

  const ratingLabels = {
    group: t("rating.label"),
    bad: t("rating.bad"),
    okay: t("rating.okay"),
    good: t("rating.good"),
  };

  /** Keep details sheet in sync after watch/rate mutations refresh `detail`. */
  const liveDetailsEpisode = useMemo(() => {
    if (!detailsEpisode) return null;
    if (!detail) return detailsEpisode;
    for (const season of detail.seasons) {
      const found = season.episodes.find((ep) => ep.id === detailsEpisode.id);
      if (found) return found;
    }
    return detailsEpisode;
  }, [detailsEpisode, detail]);

  const countdownLabels = useMemo<UnairedTrailingMarkLabels>(
    () => ({
      day: (count) => t("episode.countdownUnit.day", { count }),
      hour: (count) => t("episode.countdownUnit.hour", { count }),
      minute: t("episode.countdownUnit.minute"),
      second: t("episode.countdownUnit.second"),
      tbd: t("episode.tbd"),
    }),
    [t],
  );

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
    setExpandedSeasonGaps(new Set());
    setOpenSeason("");
    prevSeasonCompleteRef.current = new Map();
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) return;
    const nextDefault = defaultExpandedSeasonNumber(
      detail.nextUnwatched ? { s: detail.nextUnwatched.s, e: detail.nextUnwatched.e } : null,
    );
    setOpenSeason((prev) => {
      if (prev !== "") return prev;
      return nextDefault != null ? String(nextDefault) : "";
    });
  }, [detail]);

  useEffect(() => {
    if (!detail) return;
    const currentOpen = openSeasonRef.current;
    const openNum = currentOpen === "" ? null : Number(currentOpen);
    const advanced = autoAdvanceIfSeasonJustCompleted(
      detail.seasons,
      Number.isFinite(openNum) ? openNum : null,
      prevSeasonCompleteRef.current,
    );
    prevSeasonCompleteRef.current = seasonCompleteSnapshot(detail.seasons);
    if (advanced !== undefined) {
      setOpenSeason(advanced == null ? "" : String(advanced));
      if (advanced != null) {
        pinSeasonSection(advanced);
      }
    }
  }, [detail, pinSeasonSection]);

  function fail(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback);
  }

  async function watchOnly(
    episodeId: number,
    priorRating?: 1 | 2 | 3 | null,
    opts?: { skipRatingPrompt?: boolean },
  ) {
    setBusyEpisode(episodeId);
    try {
      await addEpisodeWatch(episodeId);
      await load();
      if (!opts?.skipRatingPrompt && shouldPromptEpisodeRating(priorRating)) {
        setPromptEpisodeId(episodeId);
      }
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

  function onEpisodeToggle(episode: EpisodeSummary, watchControl: View | null = null) {
    if (!uiIsEpisodeAired(episode)) return;
    const next = detail?.nextUnwatched ?? null;
    const hasUnwatchedBefore =
      episode.watchCount === 0 &&
      next !== null &&
      (episode.s > next.s || (episode.s === next.s && episode.e > next.e));

    if (episode.watchCount > 0) {
      episodeMenuAnchorRef.current = watchControl;
      pendingEditDateRef.current = null;
      setEpisodeSheet({ episode, mode: "watched" });
      return;
    }
    if (hasUnwatchedBefore) {
      episodeMenuAnchorRef.current = watchControl;
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

  async function setAsCover() {
    if (!detail?.backdropRef) return;
    setMenuBusy(true);
    setError(null);
    try {
      const next = await updateSettings({ bannerRef: detail.backdropRef });
      setSettings(next);
    } catch (err) {
      fail(err, "banner_failed");
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

  const seasonEntries = useMemo(() => {
    if (!detail) return [];
    const sorted = sortSeasonsSpecialsLast(detail.seasons);
    return collapseCompletedSeasonRuns(sorted, isSeasonComplete, expandedSeasonGaps);
  }, [detail, expandedSeasonGaps]);

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
        ...(detail.backdropRef
          ? [
              {
                key: "useAsCover",
                label: t("profile.banner.useAsCover", {
                  defaultValue: "Use as profile cover",
                }),
                icon: <ImageIcon size={16} color={colors.muted} />,
                onPress: () => {
                  void setAsCover();
                },
              } satisfies ActionSheetItem,
            ]
          : []),
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
          onPress: () => {
            pendingRemoveRef.current = true;
          },
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
        <SkeletonSeriesDetailHero insetsTop={insets.top + WORDMARK_ROW_H} />
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

  // Two sheets (not one with a mode ternary): closing clears `episodeSheet`, and a
  // ternary would flip presentation modal→popover mid-close animation. On tablet
  // that sets `transform: undefined`, and RN `processTransform(null)` throws
  // "Cannot read properties of null (reading 'forEach')".
  const upToHereEpisode = episodeSheet?.mode === "upToHere" ? episodeSheet.episode : null;
  const watchedMenuEpisode = episodeSheet?.mode === "watched" ? episodeSheet.episode : null;

  const upToHereItems: ActionSheetItem[] = upToHereEpisode
    ? [
        {
          key: "upTo",
          label: t("episode.watchedUpToHere"),
          primary: true,
          onPress: () => {
            void watchUpTo(upToHereEpisode.id);
          },
        },
        {
          key: "only",
          label: t("episode.markOnlyThis"),
          onPress: () => {
            void watchOnly(upToHereEpisode.id, upToHereEpisode.myRating);
          },
        },
      ]
    : [];

  const watchedMenuItems: ActionSheetItem[] = watchedMenuEpisode
    ? [
        {
          key: "again",
          label: t("episode.watchAgain"),
          onPress: () => {
            void watchOnly(watchedMenuEpisode.id, watchedMenuEpisode.myRating);
          },
        },
        {
          key: "edit",
          label: t("episode.editDate"),
          onPress: () => {
            pendingEditDateRef.current = watchedMenuEpisode;
          },
        },
        {
          key: "unwatch",
          label:
            watchedMenuEpisode.watchCount > 1
              ? t("episode.removeRewatch")
              : t("episode.markAsUnwatched"),
          danger: true,
          onPress: () => {
            void unwatchLatest(watchedMenuEpisode.id);
          },
        },
      ]
    : [];
  // Header sits over backdrop — keep bar transparent; title empty so hero owns the name.
  const headerPad = WORDMARK_ROW_H;

  const toggleSeason = (seasonNumber: number) => {
    const key = String(seasonNumber);
    const collapsing = openSeason === key;
    setOpenSeason(collapsing ? "" : key);
    if (!collapsing) {
      pinSeasonSection(seasonNumber);
    }
  };

  const listHeaderParts: ReactNode[] = [
    <SeriesDetailHero
      key="hero"
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
      detailsIcon={<Info size={18} color={colors.snow} strokeWidth={1.5} />}
    />,
  ];

  if (error) {
    listHeaderParts.push(
      <Text key="error" className="mt-6 px-4 font-mono text-xs text-red-400">
        {error}
      </Text>,
    );
  }

  if (detail.needsReview) {
    listHeaderParts.push(
      <View key="needs-review" className="mt-6">
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
      </View>,
    );
  }

  if (showNextUp && nextEpisode) {
    listHeaderParts.push(
      <View key="next-up" className="mt-6">
        <SeriesDetailNextUp
          episode={nextEpisode}
          locale={i18n.language}
          title={t("series.nextUp")}
          busy={busyEpisode === nextEpisode.id}
          promptOpen={promptEpisodeId === nextEpisode.id}
          ratingLabels={ratingLabels}
          countdownLabels={countdownLabels}
          finaleLabel={t("episode.finale")}
          untitledLabel={t("episode.untitled", { defaultValue: "Untitled" })}
          skipLabel={t("rating.skip")}
          onPress={() => setDetailsEpisode(nextEpisode)}
          onToggleWatch={(watchControl) => {
            onEpisodeToggle(nextEpisode, watchControl);
          }}
          onRate={(value) => {
            void rateEpisode(nextEpisode.id, value);
          }}
          onDismissPrompt={() => setPromptEpisodeId(null)}
        />
      </View>,
    );
  }

  const stickySections: StickySection[] = [];
  let seasonsStarted = false;
  for (const entry of seasonEntries) {
    const isFirstSeasonBlock = !seasonsStarted;
    seasonsStarted = true;

    if (entry.kind === "gap") {
      // Match the first-season spacer so the gap pill isn't glued to Next up.
      if (isFirstSeasonBlock) {
        stickySections.push({
          key: "seasons-top",
          body: <View className="h-6" />,
        });
      }
      stickySections.push({
        key: entry.gapKey,
        body: (
          <CollapsedSeasonsGap
            count={entry.seasons.length}
            label={t("series.hiddenSeasonsWatched", { count: entry.seasons.length })}
            onExpand={() => {
              setExpandedSeasonGaps((prev) => new Set([...prev, entry.gapKey]));
            }}
          />
        ),
      });
      continue;
    }

    const season = entry.season;
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
      totalCount === 0 ? t("episode.tbd") : formatSeasonCount(watchedCount, totalCount, finished);
    const seasonKey = String(season.number);
    const expanded = openSeason === seasonKey;

    if (isFirstSeasonBlock) {
      stickySections.push({
        key: "seasons-top",
        body: <View className="h-6" />,
      });
    }

    stickySections.push({
      key: `season-${season.number}`,
      renderHeader: () => (
        <SectionHeader
          className="px-3"
          leading={
            hasAiredUnwatched || hasWatched ? (
              <SeasonRingMenuButton
                progressPct={progressPct}
                finished={finished}
                caughtUpWaiting={caughtUpWaiting}
                accessibilityLabel={t("series.seasonMenu")}
                onOpen={(anchor) => {
                  seasonMenuAnchorRef.current = anchor;
                  pendingUnwatchSeasonRef.current = null;
                  setSeasonMenu(season.number);
                }}
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <CircularProgress
                  size={SEASON_PROGRESS_SIZE}
                  value={progressPct}
                  complete={finished}
                  caughtUp={caughtUpWaiting}
                />
              </View>
            )
          }
          label={seasonLabel}
          count={seasonCount}
          onPress={() => {
            toggleSeason(season.number);
          }}
        />
      ),
      body: (
        <AccordionPanel open={expanded} animated={false} contentClassName="gap-0.5 pb-2 pt-2">
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
              <SeriesDetailEpisodeRow
                key={ep.id}
                ep={ep}
                locale={i18n.language}
                busy={busyEpisode === ep.id}
                promptOpen={promptEpisodeId === ep.id}
                ratingLabels={ratingLabels}
                countdownLabels={countdownLabels}
                finaleLabel={t("episode.finale")}
                untitledLabel={t("episode.untitled", { defaultValue: "Untitled" })}
                skipLabel={t("rating.skip")}
                onRate={(value) => {
                  void rateEpisode(ep.id, value);
                }}
                onDismissPrompt={() => setPromptEpisodeId(null)}
                onPress={() => setDetailsEpisode(ep)}
                onToggleWatch={(watchControl) => {
                  onEpisodeToggle(ep, watchControl);
                }}
              />
            ))
          )}
        </AccordionPanel>
      ),
    });
  }

  return (
    <View className="flex-1 bg-void">
      <StickySectionScroll
        scrollRef={stickyScrollRef}
        className="flex-1 bg-void"
        contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
        stickyOffset={stickySectionTop(insets.top)}
        contentTopSpacer={0}
        sections={stickySections}
        listHeader={listHeaderParts}
        refreshing={refreshing}
        onScroll={bannerScrub.onScroll}
        scrollEventThrottle={bannerScrub.scrollEventThrottle}
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
      />

      <ActionSheet
        isOpen={seriesMenuOpen}
        onClose={() => setSeriesMenuOpen(false)}
        title={t("series.menu")}
        items={seriesMenuItems}
        busy={menuBusy}
        presentation="popover"
        anchorRef={seriesMenuAnchorRef}
        popoverAlign="end"
        onExitComplete={() => {
          if (!pendingRemoveRef.current) return;
          pendingRemoveRef.current = false;
          setRemoveOpen(true);
        }}
      />

      <ActionSheet
        isOpen={seasonMenu != null}
        onClose={() => setSeasonMenu(null)}
        title={t("series.seasonMenu")}
        busy={seasonBusy}
        presentation="popover"
        anchorRef={seasonMenuAnchorRef}
        popoverAlign="center"
        onExitComplete={() => {
          const season = pendingUnwatchSeasonRef.current;
          if (season == null) return;
          pendingUnwatchSeasonRef.current = null;
          setUnwatchSeasonConfirm(season);
        }}
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
                    if (seasonMenu != null) pendingUnwatchSeasonRef.current = seasonMenu;
                  },
                },
              ]
            : []),
        ]}
      />

      <ActionSheet
        isOpen={upToHereEpisode != null}
        onClose={() => setEpisodeSheet(null)}
        title={t("episode.watchedUpToHereTitle")}
        description={t("episode.watchedUpToHereDesc")}
        variant="confirm"
        presentation="modal"
        items={upToHereItems}
        busy={busyEpisode != null}
      />

      <ActionSheet
        isOpen={watchedMenuEpisode != null}
        onClose={() => setEpisodeSheet(null)}
        title={t("episode.menu")}
        variant="list"
        presentation="popover"
        anchorRef={episodeMenuAnchorRef}
        popoverAlign="end-top"
        items={watchedMenuItems}
        busy={busyEpisode != null}
        onExitComplete={() => {
          const ep = pendingEditDateRef.current;
          if (!ep) return;
          pendingEditDateRef.current = null;
          setEditDateEpisode(ep);
        }}
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
        title={t("episode.detailsTitle")}
        s={liveDetailsEpisode?.s ?? 0}
        e={liveDetailsEpisode?.e ?? 0}
        episodeTitle={liveDetailsEpisode?.title ?? null}
        overview={liveDetailsEpisode?.overview}
        stillUrl={liveDetailsEpisode ? buildImageUrl(liveDetailsEpisode.stillRef, "large") : null}
        seriesTitle={detail.title}
        airDate={liveDetailsEpisode?.airDate}
        locale={i18n.language}
        runtimeLabel={
          liveDetailsEpisode?.runtimeMin != null
            ? t("episode.runtimeMin", { minutes: liveDetailsEpisode.runtimeMin })
            : null
        }
        watched={(liveDetailsEpisode?.watchCount ?? 0) > 0}
        lastWatchedAt={liveDetailsEpisode?.lastWatchedAt}
        myRating={liveDetailsEpisode?.myRating ?? null}
        ratingLabels={ratingLabels}
        onRate={(value) => {
          if (liveDetailsEpisode && value != null) void rateEpisode(liveDetailsEpisode.id, value);
        }}
        onToggleWatch={
          liveDetailsEpisode
            ? () => {
                const ep = liveDetailsEpisode;
                // E205 — stay open; rate in-sheet; skip row popup. Direct toggle
                // (no up-to-here / watched-options sheets) matches web details modal.
                if (ep.watchCount > 0) {
                  void unwatchLatest(ep.id);
                } else {
                  void watchOnly(ep.id, ep.myRating, { skipRatingPrompt: true });
                }
              }
            : undefined
        }
        toggleLabel={
          liveDetailsEpisode == null
            ? undefined
            : liveDetailsEpisode.watchCount > 1
              ? t("episode.removeRewatch")
              : liveDetailsEpisode.watchCount > 0
                ? t("episode.markAsUnwatched")
                : t("episode.toggleWatched")
        }
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
          body={t("library.removeConfirm", { title: detail.title })}
          confirmLabel={t("library.card.remove")}
          cancelLabel={t("watch.removeSectionCancel")}
          variant="danger"
          onClose={() => setRemoveOpen(false)}
          onConfirm={() => {
            void onRemove();
          }}
        />
      ) : null}
    </View>
  );
}
