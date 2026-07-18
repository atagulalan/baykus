import { useNavigate } from "@tanstack/react-router";
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
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset highlight whenever the visible result set changes (E154).
  const resultsIdentity = results.map(resultKey).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: resultsIdentity is the intentional reset trigger
  useEffect(() => {
    setActiveIndex(-1);
  }, [resultsIdentity]);

  const openSameTab = (result: SearchResult) => {
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
    if (!search.enabled || results.length === 0) return;

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

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={search.enabled && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onKeyDown={onInputKeyDown}
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        className="w-full border-b border-white/20 bg-transparent px-3 py-3 text-lg text-snow placeholder:text-muted/50 focus:outline-none focus:border-yellow transition-colors"
      />

      {!search.enabled ? (
        <p className="py-12 text-center font-mono text-xs text-muted/70">{t("search.page.hint")}</p>
      ) : search.isLoading ? (
        <p className="p-4 text-center font-mono text-sm text-muted">{t("search.loading")}</p>
      ) : search.isError ? (
        <div className="flex items-center justify-between p-4 font-mono text-sm text-red-400">
          <span>{t("search.providerError")}</span>
          <button type="button" onClick={() => search.refetch()} className="text-snow underline">
            {t("search.retry")}
          </button>
        </div>
      ) : results.length === 0 ? (
        <p className="p-4 text-center font-mono text-sm text-muted">{t("search.noResults")}</p>
      ) : (
        <div
          id={listId}
          role="listbox"
          className="flex flex-col divide-y divide-white/5 border border-white/5"
        >
          {results.map((result, index) => {
            const key = resultKey(result);
            const selected = index === activeIndex;
            return (
              <button
                key={key}
                type="button"
                id={optionId(listId, key)}
                role="option"
                aria-selected={selected}
                onClick={() => openSameTab(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  selected ? "bg-white/10" : ""
                }`}
              >
                <SearchResultThumb result={result} id={`search-thumb-${key}`} />
                <div className="flex flex-1 flex-col justify-center overflow-hidden">
                  <span className="truncate font-display italic text-snow text-lg">
                    {result.title}
                  </span>
                  <span className="font-mono text-[10px] tracking-wide text-muted truncate">
                    {[result.year, result.network].filter(Boolean).join(t("common.separator"))}
                    {result.libraryItemId != null
                      ? `${t("common.separator")}${t("search.inLibrary")}`
                      : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
