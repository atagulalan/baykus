import {
  ApiError,
  addSeries,
  buildImageUrl,
  type SearchResult,
  searchSeries,
  seriesParam,
} from "@baykus/api-client";
import {
  borders,
  colors,
  EmptyPanel,
  haptic,
  ROUNDED_CHECKBOX_SIZE_CLASS,
  SearchResultThumb,
  SkeletonSearchResults,
  space,
} from "@baykus/ui";
import { router } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabContentBottom, tabContentTop } from "../../src/chrome/layout.ts";

function previewHref(hit: SearchResult): string {
  const q = new URLSearchParams();
  const ids = hit.externalIds;
  if (ids.tmdbId != null) q.set("tmdbId", String(ids.tmdbId));
  if (ids.tvmazeId != null) q.set("tvmazeId", String(ids.tvmazeId));
  if (ids.imdbId) q.set("imdbId", ids.imdbId);
  if (ids.tvdbId != null) q.set("tvdbId", String(ids.tvdbId));
  return `/series/new?${q.toString()}`;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void searchSeries(debounced)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "search_failed",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  async function quickAdd(hit: SearchResult, key: string) {
    setAddingKey(key);
    setError(null);
    try {
      const summary = await addSeries(hit.externalIds);
      router.push(`/series/${seriesParam(summary)}`);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === "CONFLICT" &&
        err.details &&
        typeof err.details === "object" &&
        "itemId" in err.details
      ) {
        const itemId = (err.details as { itemId: number }).itemId;
        router.push(
          `/series/${seriesParam({ id: itemId, tmdbId: hit.externalIds.tmdbId ?? null })}`,
        );
        return;
      }
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "add_failed",
      );
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <View
      className="flex-1 bg-void px-4"
      style={{ paddingTop: tabContentTop(insets.top) + space.pageTop }}
    >
      <TextInput
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Search series…"
        placeholderTextColor="#888888"
        className="mb-6 h-11 rounded-lg border border-white/15 px-3 font-sans text-sm text-snow"
      />

      {error ? <Text className="mb-3 font-mono text-xs text-red-400">{error}</Text> : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: tabContentBottom(insets.bottom),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {loading ? (
          <SkeletonSearchResults rows={4} />
        ) : debounced.length < 2 ? (
          <EmptyPanel
            icon={Search}
            title="Find a show"
            hint="Type at least two characters. Tap a result to preview or add."
          />
        ) : items.length === 0 ? (
          <EmptyPanel icon={Search} title="No results" hint={`Nothing matched “${debounced}”.`} />
        ) : (
          <View className="gap-1">
            {items.map((hit) => {
              const key = `${hit.providerId}:${hit.externalIds.tmdbId ?? hit.externalIds.tvmazeId ?? hit.title}`;
              const inLibrary = hit.libraryItemId != null;
              const adding = addingKey === key;
              return (
                <View key={key} className="flex-row items-center gap-2 rounded-lg px-1 py-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      haptic("selection");
                      if (hit.libraryItemId != null) {
                        router.push(
                          `/series/${seriesParam({ id: hit.libraryItemId, tmdbId: hit.externalIds.tmdbId ?? null })}`,
                        );
                      } else {
                        router.push(previewHref(hit) as `/series/new?${string}`);
                      }
                    }}
                    className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-80"
                  >
                    <SearchResultThumb
                      imageUrl={buildImageUrl(hit.posterRef ?? null, "thumb")}
                      title={hit.title}
                    />
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-sm text-snow">
                        {hit.title}
                      </Text>
                      <Text className="font-mono text-[10px] text-muted">
                        {[hit.year, hit.network, inLibrary ? "in library" : "not in library"]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </Pressable>
                  {!inLibrary ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add to library"
                      disabled={adding || addingKey !== null}
                      onPress={() => {
                        haptic("medium");
                        void quickAdd(hit, key);
                      }}
                      className={`${ROUNDED_CHECKBOX_SIZE_CLASS} shrink-0 items-center justify-center bg-transparent active:opacity-80 disabled:opacity-40`}
                      style={borders.idle}
                    >
                      {adding ? (
                        <ActivityIndicator color={colors.muted} size="small" />
                      ) : (
                        <Plus size={18} color={colors.muted} strokeWidth={2} />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
