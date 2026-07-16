import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ManualListPicker } from "../components/ManualListPicker.tsx";
import { SearchResultThumb } from "../components/SearchResultThumb.tsx";
import { resultKey, useSeriesSearch } from "../lib/useSeriesSearch.ts";

/** E68: full-page search — mobile's "Ara" tab destination. Adding stays on the page (multi-add). */
export function SearchPage() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useSeriesSearch();
  const { pending, results } = search;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-4">
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
      ) : pending ? (
        <div className="flex items-center gap-3 border border-white/5 bg-[#101010] p-4">
          <span className="flex-1 truncate font-display italic text-base">{pending.title}</span>
          <ManualListPicker value={search.manualList} onChange={search.setManualList} />
          <button
            type="button"
            disabled={search.addMutation.isPending}
            onClick={() => search.addMutation.mutate(pending)}
            className="font-mono text-[10px] tracking-widest uppercase bg-yellow text-[#080808] px-3 py-1.5 transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            {t("search.add")}
          </button>
          <button
            type="button"
            onClick={() => search.setPending(null)}
            className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-snow transition-colors px-2 py-1.5"
          >
            {t("search.cancel")}
          </button>
        </div>
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
                onClick={() => search.selectResult(result)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <SearchResultThumb result={result} />
                <span className="flex-1 truncate font-display italic text-snow text-lg">
                  {result.title}
                </span>
                <span className="font-mono text-[10px] tracking-wide text-muted">
                  {[result.year, result.network].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
