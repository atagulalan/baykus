import {
  addSeries,
  ApiError,
  buildImageUrl,
  getSeriesPreview,
  seriesParam,
  type ExternalIds,
  type SeriesPreview,
} from "@baykus/api-client";
import {
  CastRail,
  EmptyPanel,
  MediaImage,
  PageTitle,
  SkeletonBone,
} from "@baykus/ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Clapperboard } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

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
        router.replace(`/series/${seriesParam({ id: next.libraryItemId, tmdbId: next.externalIds.tmdbId ?? null })}`);
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
      <View className="flex-1 bg-void px-4 pt-4">
        <Stack.Screen options={{ title: "Preview" }} />
        <SkeletonBone className="mb-4 aspect-[2/3] w-40 self-center rounded-md" />
        <SkeletonBone className="mb-2 h-8 w-56 self-center" />
      </View>
    );
  }

  if (!preview) {
    return (
      <View className="flex-1 bg-void">
        <Stack.Screen options={{ title: "Preview" }} />
        <EmptyPanel
          icon={Clapperboard}
          title="Preview unavailable"
          hint={error ?? "Missing provider ids from search."}
        />
      </View>
    );
  }

  const posterUrl = buildImageUrl(preview.posterRef, "large");
  const cast = preview.cast.slice(0, 12).map((c, i) => ({
    id: c.id ?? `${c.name}-${i}`,
    name: c.name,
    character: c.character ?? null,
    photoUrl: buildImageUrl(c.profileRef ?? null, "thumb"),
  }));

  return (
    <ScrollView className="flex-1 bg-void" contentContainerClassName="pb-10">
      <Stack.Screen options={{ title: preview.title }} />
      <View className="items-center gap-4 px-4 pt-2">
        <View className="aspect-[2/3] w-40 overflow-hidden rounded-md bg-white/5">
          {posterUrl ? (
            <MediaImage
              src={posterUrl}
              accessibilityLabel={preview.title}
              wrapperClassName="h-full w-full"
              className="h-full w-full"
            />
          ) : null}
        </View>
        <PageTitle className="text-center">{preview.title}</PageTitle>
        <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {[preview.year, preview.network, preview.releaseStatus].filter(Boolean).join(" · ")}
        </Text>
        {preview.overview ? (
          <Text className="text-center text-sm leading-5 text-muted">{preview.overview}</Text>
        ) : null}
        {error ? <Text className="font-mono text-xs text-red-400">{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void onAdd();
          }}
          className="mt-2 h-11 w-full max-w-sm items-center justify-center rounded-full bg-yellow disabled:opacity-40"
        >
          {busy ? (
            <ActivityIndicator color="#080808" />
          ) : (
            <Text className="font-mono text-xs uppercase tracking-widest text-void">
              Add to library
            </Text>
          )}
        </Pressable>
      </View>
      {cast.length > 0 ? <CastRail className="mt-8" title="Cast" cast={cast} /> : null}
      <Text className="mt-8 px-4 text-center font-mono text-[10px] text-muted">
        {preview.seasons.reduce((n, s) => n + s.episodes.length, 0)} episodes across{" "}
        {preview.seasons.length} seasons — mark watched after adding.
      </Text>
    </ScrollView>
  );
}
