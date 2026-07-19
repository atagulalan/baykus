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
    <div className="grid grid-cols-[7rem_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
      {items.map((item) => {
        const width = item.value > 0 ? Math.max(2, (item.value / max) * 100) : 0;
        const title = `${item.label}: ${item.displayValue}`;
        return (
          <div key={item.key} className="contents">
            <span
              title={title}
              className="truncate font-mono text-xs uppercase tracking-widest text-muted"
            >
              {item.label}
            </span>
            <div title={title} className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                aria-hidden
                className={`h-full rounded-full transition-all duration-500 ${item.muted ? "bg-white/10" : "bg-yellow"}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span
              title={title}
              className="whitespace-nowrap text-right font-mono text-xs text-muted tabular-nums"
            >
              {item.displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}
