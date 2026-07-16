import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/client.ts";
import type { SearchResult } from "../api/types.ts";
import { SearchResultThumb } from "../components/SearchResultThumb.tsx";
import { resultKey, useSeriesSearch } from "../lib/useSeriesSearch.ts";

/** E68/E77: full-page search — mobile's "Ara" tab and the desktop header icon's destination. Navigates to series page immediately on click. */
export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useSeriesSearch();
  const { pending, results } = search;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    search.setPending(result);
    search.addMutation.mutate(result, {
      onSuccess: (summary) => {
        navigate({ to: "/series/$id", params: { id: summary.id.toString() } });
      },
      onError: (error) => {
        if (
          error instanceof ApiError &&
          error.code === "CONFLICT" &&
          error.details &&
          typeof error.details === "object" &&
          "itemId" in error.details
        ) {
          const itemId = (error.details as { itemId: number }).itemId;
          navigate({ to: "/series/$id", params: { id: itemId.toString() } });
        } else {
          search.setPending(null);
        }
      },
    });
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
          {results.map((result) => {
            const isPending = pending && resultKey(pending) === resultKey(result);
            return (
              <li key={resultKey(result)}>
                <button
                  type="button"
                  disabled={!!isPending}
                  onClick={() => handleSelectResult(result)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  <SearchResultThumb result={result} />
                  <div className="flex flex-1 flex-col justify-center overflow-hidden">
                    <span className="truncate font-display italic text-snow text-lg">
                      {result.title}
                    </span>
                    <span className="font-mono text-[10px] tracking-wide text-muted truncate">
                      {[result.year, result.network].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {isPending && (
                    <span className="font-mono text-[10px] tracking-widest uppercase text-yellow animate-pulse">
                      {t("search.loading")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
