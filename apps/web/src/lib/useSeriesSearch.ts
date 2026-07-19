import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
  const navigate = useNavigate();
  const { q: urlQuery = "" } = useSearch({ from: "/search" });
  const [query, setQueryState] = useState(urlQuery);

  // Keep the draft in sync when the URL changes externally (back/forward, deep link).
  useEffect(() => {
    setQueryState(urlQuery);
  }, [urlQuery]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
  }, []);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const enabled = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  // Debounced URL sync — same-route search-param updates must not run the global
  // view transition on every keystroke (router defaultViewTransition, E51).
  useEffect(() => {
    const nextQ = debouncedQuery.length > 0 ? debouncedQuery : undefined;
    const currentQ = urlQuery.length > 0 ? urlQuery : undefined;
    if (nextQ === currentQ) return;
    void navigate({
      to: "/search",
      search: { q: nextQ },
      replace: true,
      viewTransition: false,
    });
  }, [debouncedQuery, navigate, urlQuery]);

  const [pending, setPending] = useState<SearchResult | null>(null);
  const [manualList, setManualList] = useState<ManualList | null>(null);

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
