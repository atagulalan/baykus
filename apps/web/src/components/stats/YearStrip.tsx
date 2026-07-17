interface YearStripProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

/**
 * Horizontal scrollable year button strip (E112). Replaces the `<select>`
 * YearSelect. Each year is a button; active year gets yellow border-bottom.
 */
export function YearStrip({ years, value, onChange }: YearStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onChange(year)}
          className={`shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-widest transition-colors ${
            year === value
              ? "text-yellow border-b-2 border-yellow font-bold"
              : "text-muted hover:text-snow border-b-2 border-transparent"
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
