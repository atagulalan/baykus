export interface HBarListItem {
  key: string;
  label: string;
  value: number;
  displayValue: string;
  /** "Diğer" rows (ui.md) — muted fill instead of the yellow accent. */
  muted?: boolean;
}

interface HBarListProps {
  items: HBarListItem[];
}

/** ui.md primitive: label / track / value row, width relative to the row set's max. */
export function HBarList({ items }: HBarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const width = item.value > 0 ? Math.max(2, (item.value / max) * 100) : 0;
        return (
          <div
            key={item.key}
            title={`${item.label}: ${item.displayValue}`}
            className="flex items-center gap-3 text-sm"
          >
            <span className="w-28 shrink-0 truncate font-mono text-xs uppercase tracking-widest text-muted">
              {item.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden bg-white/5">
              <div
                aria-hidden
                className={`h-full transition-all duration-500 ${item.muted ? "bg-white/10" : "bg-yellow/60"}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-mono text-xs text-muted tabular-nums">
              {item.displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}
