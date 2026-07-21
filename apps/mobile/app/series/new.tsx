import {
  ApiError,
  addSeries,
  buildImageUrl,
  type ExternalIds,
  getSeriesPreview,
  type SeriesPreview,
  seriesParam,
} from "@baykus/api-client";
import {
  CastRail,
  colors,
  EmptyPanel,
  SeriesDetailHero,
  SkeletonSeriesDetailHero,
} from "@baykus/ui";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Clapperboard } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBannerEdgeScrub } from "../../src/chrome/EdgeScrubContext.tsx";
import { tabContentBottom, WORDMARK_ROW_H } from "../../src/chrome/layout.ts";

function idsFromParams(params: Record<string, string | string[] | undefined>): ExternalIds | null {
  const one = (key: string): string | undefined => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const ids: ExternalIds = {};
  const tmdb = one("tmdbId");
  const tvmaze = one("tvmazeId");
  const imdb = one("imdbId");
  const tvdb = one("tvdbId");
  if (tmdb) ids.tmdbId = Number(tmdb);
  if (tvmaze) ids.tvmazeId = Number(tvmaze);
  if (imdb) ids.imdbId = imdb;
  if (tvdb) ids.tvdbId = Number(tvdb);
  return Object.keys(ids).length > 0 ? ids : null;
}

export default function SeriesPreviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bannerScrub = useBannerEdgeScrub(true);
  const params = useLocalSearchParams();
  const externalIds = useMemo(() => idsFromParams(params), [params]);
  const [preview, setPreview] = useState<SeriesPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!externalIds) {
      setLoading(false);
      setError("missing_ids");
      return;
    }
    setError(null);
    try {
      const next = await getSeriesPreview(externalIds);
      if (next.libraryItemId != null) {
        router.replace(
          `/series/${seriesParam({ id: next.libraryItemId, tmdbId: next.externalIds.tmdbId ?? null })}`,
        );
        return;
      }
      setPreview(next);
    } catch (err) {
      setPreview(null);
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "load_failed",
      );
    } finally {
      setLoading(false);
    }
  }, [externalIds]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function onAdd() {
    if (!externalIds) return;
    setBusy(true);
    setError(null);
    try {
      let itemId: number;
      let tmdbId: number | null = externalIds.tmdbId ?? null;
      try {
        const summary = await addSeries(externalIds);
        itemId = summary.id;
        tmdbId = summary.tmdbId;
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.code === "CONFLICT" &&
          err.details &&
          typeof err.details === "object" &&
          "itemId" in err.details
        ) {
          itemId = (err.details as { itemId: number }).itemId;
        } else {
          throw err;
        }
      }
      router.replace(`/series/${seriesParam({ id: itemId, tmdbId })}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "add_failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-void">
        <Stack.Screen
          options={{
            title: "",
            headerTransparent: true,
            headerStyle: { backgroundColor: "transparent" },
          }}
        />
        <SkeletonSeriesDetailHero insetsTop={insets.top + WORDMARK_ROW_H} />
      </View>
    );
  }

  if (!preview) {
    return (
      <View className="flex-1 bg-void">
        <Stack.Screen options={{ title: "" }} />
        <EmptyPanel
          icon={Clapperboard}
          title="Preview unavailable"
          hint={error ?? "Missing provider ids from search."}
        />
      </View>
    );
  }

  const posterUrl = buildImageUrl(preview.posterRef, "large");
  const backdropUrl = buildImageUrl(preview.backdropRef, "large");
  const emptyProgress = {
    sequential: true,
    seasons: [] as Array<{ number: number; watched: number; total: number; announced: number }>,
  };
  const cast = preview.cast.slice(0, 12).map((c, i) => ({
    id: c.id ?? `${c.name}-${i}`,
    name: c.name,
    character: c.character ?? null,
    photoUrl: buildImageUrl(c.profileRef ?? null, "thumb"),
  }));

  return (
    <ScrollView
      className="flex-1 bg-void"
      contentContainerStyle={{ paddingBottom: tabContentBottom(insets.bottom) }}
      onScroll={bannerScrub.onScroll}
      scrollEventThrottle={bannerScrub.scrollEventThrottle}
    >
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.snow,
        }}
      />
      <SeriesDetailHero
        title={preview.title}
        year={preview.year}
        posterUrl={posterUrl}
        backdropUrl={backdropUrl}
        category="not_started"
        progress={{ watched: 0, aired: 0 }}
        seasonProgress={emptyProgress}
        insetsTop={insets.top + WORDMARK_ROW_H}
        preview
        onStartWatching={() => {
          void onAdd();
        }}
        startWatchingLabel={t("series.startWatching", { defaultValue: "Start watching" })}
        startWatchingPending={busy}
      />
      {error ? <Text className="mb-2 px-4 font-mono text-xs text-red-400">{error}</Text> : null}
      {preview.overview ? (
        <Text className="mt-4 px-4 text-sm leading-5 text-muted">{preview.overview}</Text>
      ) : null}
      {cast.length > 0 ? (
        <CastRail className="mt-8" title={t("series.cast.title")} cast={cast} />
      ) : null}
      <Text className="mt-8 px-4 text-center font-mono text-[10px] text-muted">
        {preview.seasons.reduce((n, s) => n + s.episodes.length, 0)} episodes across{" "}
        {preview.seasons.length} seasons — mark watched after adding.
      </Text>
    </ScrollView>
  );
}
