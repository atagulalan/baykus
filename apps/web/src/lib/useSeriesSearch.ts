import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, addSeries, searchSeries } from "../api/client.ts";
import type { ManualList, SearchResult } from "../api/types.ts";
import { useToast } from "./toast.tsx";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Stable key for a SearchResult across its four possible external-id shapes. */
export function resultKey(result: SearchResult): string {
  const ids = result.externalIds;
  return `${result.providerId}:${ids.tmdbId ?? ""}:${ids.tvmazeId ?? ""}:${ids.imdbId ?? ""}:${ids.tvdbId ?? ""}`;
}

/** E68: search + add-flow engine behind the /search page. Explicit add only (009 E87 amend); header dropdown retired in E77. */
export function useSeriesSearch() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<SearchResult | null>(null);
  const [manualList, setManualList] = useState<ManualList | null>(null);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const enabled = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const searchQuery = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchSeries(debouncedQuery),
    enabled,
  });

  const addMutation = useMutation({
    mutationFn: (result: SearchResult) => addSeries(result.externalIds, manualList ?? undefined),
    onSuccess: (summary) => {
      toast.show(t("search.added", { title: summary.title }));
      queryClient.invalidateQueries({ queryKey: ["library"] });
      setPending(null);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === "CONFLICT") {
        toast.show(t("search.alreadyInLibrary"), "error");
      } else {
        toast.show(t("search.addError"), "error");
      }
    },
  });

  function selectResult(result: SearchResult) {
    setPending(result);
    setManualList(null);
  }

  return {
    query,
    setQuery,
    pending,
    setPending,
    manualList,
    setManualList,
    enabled,
    results: searchQuery.data?.items ?? [],
    isLoading: searchQuery.isLoading,
    isError: searchQuery.isError,
    refetch: searchQuery.refetch,
    selectResult,
    addMutation,
  };
}
