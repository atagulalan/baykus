import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ExternalIds, SearchResult } from "../api/types.ts";
import { SearchResultThumb } from "../components/SearchResultThumb.tsx";
import { resultKey, useSeriesSearch } from "../lib/useSeriesSearch.ts";

function previewSearchParams(ids: ExternalIds): {
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
  if (ids.tmdbId != null) params.tmdbId = ids.tmdbId;
  if (ids.tvmazeId != null) params.tvmazeId = ids.tvmazeId;
  if (ids.imdbId) params.imdbId = ids.imdbId;
  if (ids.tvdbId != null) params.tvdbId = ids.tvdbId;
  return params;
}

function posterTransitionName(result: SearchResult): string {
  const ids = result.externalIds;
  return `poster-preview-${ids.tmdbId ?? ids.tvmazeId ?? ids.tvdbId ?? resultKey(result)}`;
}

/**
 * E68/E77/E131: full-page search. Row click opens the series page — library
 * items go to detail; new shows go to `/series/new` (add CTA lives there).
 */
export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useSeriesSearch();
  const { results } = search;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelectResult = (result: SearchResult) => {
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
      navigate({ to: "/series/new", search: previewSearchParams(result.externalIds) });
    };
    if (document.startViewTransition) {
      document.startViewTransition(go);
    } else {
      go();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <input
        ref={inputRef}
        type="search"
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
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
        <ul className="flex flex-col divide-y divide-white/5 border border-white/5">
          {results.map((result) => (
            <li key={resultKey(result)}>
              <button
                type="button"
                onClick={() => handleSelectResult(result)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <SearchResultThumb result={result} id={`search-thumb-${resultKey(result)}`} />
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
