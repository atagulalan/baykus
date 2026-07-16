import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { resultKey, useSeriesSearch } from "../lib/useSeriesSearch.ts";
import { ManualListPicker } from "./ManualListPicker.tsx";
import { SearchResultThumb } from "./SearchResultThumb.tsx";

export function SearchBar() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const search = useSeriesSearch({
    onAdded: () => {
      search.setQuery("");
      setOpen(false);
    },
  });
  const { query, setQuery, pending, setPending, manualList, setManualList, results } = search;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPending(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [setPending]);

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
      if (result) search.selectResult(result);
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
      {open && search.enabled && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden border border-white/5 bg-[#101010] shadow-2xl backdrop-blur-md">
          {pending ? (
            <div className="flex items-center gap-3 p-4 border-b border-white/5">
              <span className="flex-1 truncate text-sm font-display italic">{pending.title}</span>
              <ManualListPicker value={manualList} onChange={setManualList} />
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
                onClick={() => setPending(null)}
                className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-snow transition-colors px-2 py-1.5"
              >
                {t("search.cancel")}
              </button>
            </div>
          ) : search.isLoading ? (
            <div className="p-4 text-sm font-mono text-muted">{t("search.loading")}</div>
          ) : search.isError ? (
            <div className="flex items-center justify-between p-4 text-sm text-red-400 font-mono">
              <span>{t("search.providerError")}</span>
              <button
                type="button"
                onClick={() => search.refetch()}
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
                    onClick={() => search.selectResult(result)}
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
