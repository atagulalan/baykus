interface YearSelectProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

/**
 * ui.md primitive: mono uppercase segmented year picker. Each usage keeps its
 * own state — the prototype's two year-scoped groups are intentionally
 * independent, never a shared selection.
 */
export function YearSelect({ years, value, onChange }: YearSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="border border-white/10 bg-[#101010] px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-snow"
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}
