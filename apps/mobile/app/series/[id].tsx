import {
  addEpisodeWatch,
  ApiError,
  buildImageUrl,
  getSeriesByParam,
  refreshSeries,
  removeLatestEpisodeWatch,
  removeSeries,
  updateSeries,
  type EpisodeSummary,
  type SeriesDetail,
} from "@baykus/api-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  CastRail,
  CollapsedSeasonsGap,
  ConfirmDialog,
  EmptyPanel,
  EpisodeRow,
  isEpisodeAired as uiIsEpisodeAired,
  MediaImage,
  NextUpCard,
  PageTitle,
  PullToRefresh,
  SectionHeader,
  SkeletonBone,
  colors,
} from "@baykus/ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Clapperboard, RefreshCw, Star, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

function findNextEpisode(detail: SeriesDetail): EpisodeSummary | null {
  const next = detail.nextUnwatched;
  if (!next) return null;
  for (const season of detail.seasons) {
    const ep = season.episodes.find((e) => e.id === next.episodeId);
    if (ep) return ep;
  }
  return null;
}

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyEpisode, setBusyEpisode] = useState<number | null>(null);
  const [favBusy, setFavBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [expandCollapsed, setExpandCollapsed] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const next = await getSeriesByParam(id);
      setDetail(next);
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

  async function toggleWatch(episodeId: number, watched: boolean) {
    setBusyEpisode(episodeId);
    try {
      if (watched) await removeLatestEpisodeWatch(episodeId);
      else await addEpisodeWatch(episodeId);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "watch_failed",
      );
    } finally {
      setBusyEpisode(null);
    }
  }

  async function toggleFavorite() {
    if (!detail) return;
    setFavBusy(true);
    try {
      const updated = await updateSeries(detail.id, { favorite: !detail.favorite });
      setDetail((prev) => (prev ? { ...prev, favorite: updated.favorite } : prev));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "favorite_failed",
      );
    } finally {
      setFavBusy(false);
    }
  }

  async function onRefreshSeries() {
    if (!detail) return;
    setRefreshBusy(true);
    setError(null);
    try {
      await refreshSeries(detail.id);
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
      setRefreshBusy(false);
    }
  }

  async function onRemove() {
    if (!detail) return;
    try {
      await removeSeries(detail.id);
      router.back();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "remove_failed",
      );
      setRemoveOpen(false);
    }
  }

  const nextEpisode = detail ? findNextEpisode(detail) : null;

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
    const hideCount =
      !expandCollapsed && completePrefix > 1 ? Math.max(0, completePrefix - 1) : 0;
    const visible = hideCount > 0 ? seasons.slice(hideCount) : seasons;
    const openSeason =
      detail.nextUnwatched?.s != null
        ? String(detail.nextUnwatched.s)
        : visible[0]
          ? String(visible[0].number)
          : "";
    return { collapsedCount: hideCount, visibleSeasons: visible, defaultOpen: openSeason };
  }, [detail, expandCollapsed]);

  if (loading && !detail) {
    return (
      <View className="flex-1 bg-void px-4 pt-4">
        <Stack.Screen options={{ title: "…" }} />
        <SkeletonBone className="mb-4 aspect-[2/3] w-40 self-center rounded-md" />
        <SkeletonBone className="mb-2 h-8 w-56" />
        <SkeletonBone className="h-4 w-full" />
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
  const cast = detail.cast.slice(0, 12).map((c, i) => ({
    id: c.id ?? `${c.name}-${i}`,
    name: c.name,
    character: c.character ?? null,
    photoUrl: buildImageUrl(c.profileRef ?? null, "thumb"),
  }));

  return (
    <PullToRefresh
      className="flex-1 bg-void"
      contentContainerClassName="pb-10"
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
      }}
    >
      <Stack.Screen options={{ title: detail.title }} />
      <View className="items-center gap-4 px-4 pt-2">
        <View className="aspect-[2/3] w-40 overflow-hidden rounded-md bg-white/5">
          {posterUrl ? (
            <MediaImage
              src={posterUrl}
              accessibilityLabel={detail.title}
              wrapperClassName="h-full w-full"
              className="h-full w-full"
            />
          ) : null}
        </View>
        <PageTitle className="text-center">{detail.title}</PageTitle>
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh series metadata"
            disabled={refreshBusy}
            onPress={() => {
              void onRefreshSeries();
            }}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/15 active:bg-white/5 disabled:opacity-40"
          >
            {refreshBusy ? (
              <ActivityIndicator color={colors.yellow} />
            ) : (
              <RefreshCw size={18} color={colors.muted} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={detail.favorite ? "Unfavorite" : "Favorite"}
            disabled={favBusy}
            onPress={() => {
              void toggleFavorite();
            }}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/15 active:bg-white/5 disabled:opacity-40"
          >
            {favBusy ? (
              <ActivityIndicator color={colors.yellow} />
            ) : (
              <Star
                size={18}
                color={detail.favorite ? colors.yellow : colors.muted}
                fill={detail.favorite ? colors.yellow : "transparent"}
              />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove from library"
            onPress={() => setRemoveOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/15 active:bg-white/5"
          >
            <Trash2 size={18} color={colors.muted} />
          </Pressable>
        </View>
        {detail.overview ? (
          <Text className="text-center text-sm leading-5 text-muted">{detail.overview}</Text>
        ) : null}
        {error ? <Text className="font-mono text-xs text-red-400">{error}</Text> : null}
      </View>

      {nextEpisode ? (
        <View className="mt-6 px-3">
          <NextUpCard
            title="Next up"
            episode={{
              s: nextEpisode.s,
              e: nextEpisode.e,
              episodeTitle: nextEpisode.title,
              stillUrl: buildImageUrl(nextEpisode.stillRef, "thumb"),
              watched: nextEpisode.watchCount > 0,
              muted: !uiIsEpisodeAired(nextEpisode),
              checkboxDisabled: !uiIsEpisodeAired(nextEpisode) || busyEpisode === nextEpisode.id,
            }}
            onToggleWatch={() => {
              void toggleWatch(nextEpisode.id, nextEpisode.watchCount > 0);
            }}
          />
        </View>
      ) : null}

      {cast.length > 0 ? <CastRail className="mt-8" title="Cast" cast={cast} /> : null}

      <View className="mt-8">
        <CollapsedSeasonsGap
          count={collapsedCount}
          label={`${collapsedCount} watched season${collapsedCount === 1 ? "" : "s"} hidden`}
          onExpand={() => setExpandCollapsed(true)}
        />
        <Accordion type="single" defaultValue={defaultOpen} collapsible className="mt-2">
          {visibleSeasons.map((season) => (
            <AccordionItem key={season.number} value={String(season.number)}>
              <AccordionTrigger className="w-full">
                <SectionHeader
                  label={season.name ?? `Season ${season.number}`}
                  count={season.episodes.length}
                  expanded={undefined}
                />
              </AccordionTrigger>
              <AccordionContent>
                <View className="pb-2">
                  {season.episodes.map((ep) => (
                    <EpisodeRow
                      key={ep.id}
                      s={ep.s}
                      e={ep.e}
                      episodeTitle={ep.title}
                      stillUrl={buildImageUrl(ep.stillRef, "thumb")}
                      watched={ep.watchCount > 0}
                      muted={!uiIsEpisodeAired(ep)}
                      checkboxDisabled={busyEpisode === ep.id || !uiIsEpisodeAired(ep)}
                      onToggleWatch={() => {
                        void toggleWatch(ep.id, ep.watchCount > 0);
                      }}
                    />
                  ))}
                </View>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </View>

      {removeOpen ? (
        <ConfirmDialog
          title="Remove series?"
          body="This removes the show and its watches from your library."
          confirmLabel="Remove"
          cancelLabel="Cancel"
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
