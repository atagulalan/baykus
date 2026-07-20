import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft, Loader2, RotateCw, Search, SearchX, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SearchResult } from "../../api/types.ts";
import { SearchResultThumb } from "../../components/molecules/SearchResultThumb/SearchResultThumb.tsx";
import { nextSearchActiveIndex, resolveSearchEnterIndex } from "../../lib/searchListKeyboard.ts";
import { searchResultPath } from "../../lib/searchResultPath.ts";
import { resultKey, useSeriesSearch } from "../../lib/useSeriesSearch.ts";

function posterTransitionName(result: SearchResult): string {
  const ids = result.externalIds;
  return `poster-preview-${ids.tmdbId ?? ids.tvmazeId ?? ids.tvdbId ?? resultKey(result)}`;
}

function optionId(listId: string, key: string): string {
  return `${listId}-opt-${key}`;
}

/**
 * E154: the highlighted result survives a round-trip to a series page. The
 * query itself lives in the URL (`?q=`), so returning already restores the
 * list — but `activeIndex` is local state lost on unmount. We stash the opened
 * result's key here (module-scoped so it outlives the remount) alongside the
 * query it belonged to, so a later, different query never restores a stale row.
 */
let rememberedActive: { q: string; key: string } | null = null;

/** Index of the remembered highlight in the current results, or -1 if none/stale. */
function restoreActiveIndex(query: string, results: SearchResult[]): number {
  if (rememberedActive == null || rememberedActive.q !== query) return -1;
  const { key } = rememberedActive;
  return results.findIndex((result) => resultKey(result) === key);
}

function previewSearchParams(result: SearchResult): {
  tmdbId?: number;
  tvmazeId?: number;
  imdbId?: string;
  tvdbId?: number;
} {
  const params: {
    tmdbId?: number;
    tvmazeId?: number;
    imdbId?: string;
    tvdbId?: number;
  } = {};
  const ids = result.externalIds;
  if (ids.tmdbId != null) params.tmdbId = ids.tmdbId;
  if (ids.tvmazeId != null) params.tvmazeId = ids.tvmazeId;
  if (ids.imdbId) params.imdbId = ids.imdbId;
  if (ids.tvdbId != null) params.tvdbId = ids.tvdbId;
  return params;
}

/**
 * E68/E77/E131/E154: full-page search. Row click / Enter opens the series
 * page; Shift+Enter opens in a new tab. Library items → detail; new shows →
 * `/series/new` (add CTA lives there).
 */
export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const search = useSeriesSearch();
  const { results } = search;
  const resultsIdentity = results.map(resultKey).join("|");
  // Restore the remembered highlight up front (no first-frame flash) when the
  // cached results are already present on mount after navigating back (E154).
  const [activeIndex, setActiveIndex] = useState(() => restoreActiveIndex(search.query, results));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // When the visible result set changes, either re-restore the remembered
  // highlight (returning from a series page, results arriving post-mount) or
  // clear it so keyboard nav restarts from the top on a fresh query (E154).
  const prevIdentityRef = useRef(resultsIdentity);
  // biome-ignore lint/correctness/useExhaustiveDependencies: resultsIdentity is the intentional trigger; query/results are read fresh from the same render
  useEffect(() => {
    if (prevIdentityRef.current === resultsIdentity) return;
    prevIdentityRef.current = resultsIdentity;
    setActiveIndex(restoreActiveIndex(search.query, results));
  }, [resultsIdentity]);

  const openSameTab = (result: SearchResult) => {
    // Remember this row so the highlight returns if the user navigates back.
    rememberedActive = { q: search.query, key: resultKey(result) };
    const thumb = document.getElementById(`search-thumb-${resultKey(result)}`);
    if (result.libraryItemId != null) {
      if (thumb) {
        thumb.style.viewTransitionName = `poster-${result.libraryItemId}`;
      }
      const go = () => {
        navigate({ to: "/series/$id", params: { id: `i${result.libraryItemId}` } });
      };
      if (document.startViewTransition) {
        document.startViewTransition(go);
      } else {
        go();
      }
      return;
    }

    if (thumb) {
      thumb.style.viewTransitionName = posterTransitionName(result);
    }
    const go = () => {
      navigate({ to: "/series/new", search: previewSearchParams(result) });
    };
    if (document.startViewTransition) {
      document.startViewTransition(go);
    } else {
      go();
    }
  };

  const openNewTab = (result: SearchResult) => {
    window.open(searchResultPath(result), "_blank", "noopener,noreferrer");
  };

  const activeResult = activeIndex >= 0 ? results[activeIndex] : undefined;
  const activeDescendant =
    activeResult != null ? optionId(listId, resultKey(activeResult)) : undefined;

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // E154: list keys only while settled results are shown — not during
    // debounce/fetch, when `results` may still hold the previous query's rows.
    if (!search.enabled || search.isLoading || results.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const key = e.key;
      setActiveIndex((i) => nextSearchActiveIndex(i, key, results.length));
      return;
    }

    if (e.key === "Escape") {
      if (activeIndex >= 0) {
        e.preventDefault();
        setActiveIndex(-1);
      }
      return;
    }

    if (e.key === "Enter") {
      const enterIndex = resolveSearchEnterIndex(activeIndex, results.length);
      const target = enterIndex >= 0 ? results[enterIndex] : undefined;
      if (target == null) return;
      e.preventDefault();
      if (e.shiftKey) {
        openNewTab(target);
      } else {
        openSameTab(target);
      }
    }
  };

  // Page owns horizontal gutter (E157) + top inset (E183); MainShell is flush.
  return (
    <div className="page-top mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 sm:gap-5 sm:px-0">
      <div className="relative flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 shadow-sm backdrop-blur-md transition-colors focus-within:border-white/20 focus-within:bg-white/[0.05] sm:gap-3 sm:px-5">
        <Search size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={search.enabled && !search.isLoading && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-snow placeholder:text-muted/40 focus:outline-none sm:py-3.5 sm:text-lg [&::-webkit-search-cancel-button]:appearance-none"
        />
        {search.enabled && search.isLoading ? (
          <Loader2 size={18} strokeWidth={2} className="shrink-0 animate-spin text-muted" />
        ) : search.query ? (
          <button
            type="button"
            onClick={() => {
              search.setQuery("");
              inputRef.current?.focus();
            }}
            aria-label={t("search.clear")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-snow active:scale-90"
          >
            <X size={16} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {!search.enabled ? (
        <div className="flex flex-col items-center gap-4 py-14 text-center sm:py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <Search size={22} strokeWidth={1.5} className="text-muted/50" />
          </div>
          <p className="max-w-[15rem] text-sm text-muted/70">{t("search.page.hint")}</p>
        </div>
      ) : search.isLoading ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center sm:py-16">
          <Loader2 size={22} strokeWidth={2} className="animate-spin text-muted/60" />
          <p className="font-mono text-xs tracking-wide text-muted/60">{t("search.loading")}</p>
        </div>
      ) : search.isError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-10 text-center">
          <p className="text-sm text-red-300/90">{t("search.providerError")}</p>
          <button
            type="button"
            onClick={() => search.refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-snow shadow-sm backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]"
          >
            <RotateCw size={14} strokeWidth={1.75} />
            {t("search.retry")}
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-14 text-center sm:py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <SearchX size={22} strokeWidth={1.5} className="text-muted/50" />
          </div>
          <p className="text-sm text-muted/70">{t("search.noResults")}</p>
        </div>
      ) : (
        // Below `sm` the rows sit straight on the page, separated by spacing
        // alone like the browse grid's cards — a bordered card wrapping rows
        // reads as a box inside a box on a phone. The card returns at `sm`,
        // where the list is a floating panel under the input.
        <div
          id={listId}
          role="listbox"
          className="flex flex-col gap-1 sm:gap-0.5 sm:rounded-2xl sm:border sm:border-white/8 sm:bg-white/[0.02] sm:p-1.5 sm:backdrop-blur-sm"
        >
          {results.map((result, index) => {
            const key = resultKey(result);
            const selected = index === activeIndex;
            const metaText = [result.year, result.network]
              .filter(Boolean)
              .join(t("common.separator"));
            const inLibrary = result.libraryItemId != null;
            return (
              <button
                key={key}
                type="button"
                id={optionId(listId, key)}
                role="option"
                aria-selected={selected}
                onClick={() => openSameTab(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`group/row flex w-full items-center gap-3 rounded-md px-1.5 py-1.5 text-left transition-colors sm:gap-3.5 sm:rounded-xl sm:px-3 sm:py-2.5 ${
                  selected ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                }`}
              >
                <SearchResultThumb result={result} id={`search-thumb-${key}`} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-display text-lg text-snow italic">
                    {result.title}
                  </span>
                  {metaText || inLibrary ? (
                    <div className="flex min-w-0 items-center gap-2">
                      {metaText ? (
                        <span className="truncate font-mono text-[10px] tracking-wide text-muted">
                          {metaText}
                        </span>
                      ) : null}
                      {inLibrary ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-yellow/25 bg-yellow/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-yellow/80">
                          {t("search.inLibrary")}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {/* Enter hint is keyboard-only — hidden below sm, where it is
                    never lit (no hover) and only steals row width. */}
                <CornerDownLeft
                  size={15}
                  strokeWidth={1.75}
                  className={`hidden shrink-0 text-muted/50 transition-opacity sm:block ${
                    selected ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
