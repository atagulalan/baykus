import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, addSeries, searchSeries } from "../api/client.ts";
import { buildImageUrl } from "../api/images.ts";
import type { ManualList, SearchResult } from "../api/types.ts";
import { useToast } from "../lib/toast.tsx";
import { ManualListPicker } from "./ManualListPicker.tsx";

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

function resultKey(result: SearchResult): string {
  const ids = result.externalIds;
  return `${result.providerId}:${ids.tmdbId ?? ""}:${ids.tvmazeId ?? ""}:${ids.imdbId ?? ""}:${ids.tvdbId ?? ""}`;
}

function SearchResultThumb({ result }: { result: SearchResult }) {
  const [failed, setFailed] = useState(false);
  const url = buildImageUrl(result.posterRef);
  if (!url || failed) {
    return (
      <span className="flex h-10 w-7 shrink-0 items-center justify-center rounded bg-zinc-800 text-xs">
        🎬
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="h-10 w-7 shrink-0 rounded object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function SearchBar() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<SearchResult | null>(null);
  const [manualList, setManualList] = useState<ManualList | null>(null);
  const [highlighted, setHighlighted] = useState(0);

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
      setQuery("");
      setPending(null);
      setOpen(false);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === "CONFLICT") {
        toast.show(t("search.alreadyInLibrary"), "error");
      } else {
        toast.show(t("search.addError"), "error");
      }
    },
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPending(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = searchQuery.data?.items ?? [];

  function selectResult(result: SearchResult) {
    setPending(result);
    setManualList(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setPending(null);
      return;
    }
    if (results.length === 0 || pending) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = results[highlighted];
      if (result) selectResult(result);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setPending(null);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        className="w-full border-b border-white/20 bg-transparent px-3 py-2 text-sm text-snow placeholder:text-muted/50 focus:outline-none focus:border-yellow transition-colors"
      />
      {open && enabled && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden border border-white/5 bg-[#101010] shadow-2xl backdrop-blur-md">
          {pending ? (
            <div className="flex items-center gap-3 p-4 border-b border-white/5">
              <span className="flex-1 truncate text-sm font-display italic">{pending.title}</span>
              <ManualListPicker value={manualList} onChange={setManualList} />
              <button
                type="button"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate(pending)}
                className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-3 py-1.5 transition-opacity disabled:opacity-50 hover:opacity-90"
              >
                {t("search.add")}
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-snow transition-colors px-2 py-1.5"
              >
                {t("search.cancel")}
              </button>
            </div>
          ) : searchQuery.isLoading ? (
            <div className="p-4 text-sm font-mono text-muted">{t("search.loading")}</div>
          ) : searchQuery.isError ? (
            <div className="flex items-center justify-between p-4 text-sm text-red-400 font-mono">
              <span>{t("search.providerError")}</span>
              <button
                type="button"
                onClick={() => searchQuery.refetch()}
                className="underline text-snow"
              >
                {t("search.retry")}
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm font-mono text-muted">{t("search.noResults")}</div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {results.map((result, index) => (
                <li key={resultKey(result)}>
                  <button
                    type="button"
                    onClick={() => selectResult(result)}
                    className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors border-b border-white/5 last:border-0 hover:bg-white/5 ${
                      index === highlighted ? "bg-white/5" : ""
                    }`}
                  >
                    <SearchResultThumb result={result} />
                    <span className="flex-1 truncate font-display italic text-snow text-lg">
                      {result.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted tracking-wide">
                      {[result.year, result.network].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
