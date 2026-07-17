interface MiniBarsItem {
  key: string;
  label: string;
  value: number;
  tooltip: string;
}

interface MiniBarsProps {
  items: MiniBarsItem[];
  /** Show every Nth label (e.g. 3 for hour-of-day, 5 for ISO weeks) — default every label. */
  labelEvery?: number;
}

/** ui.md primitive: fixed 120px vertical bars, min-height for non-zero values, muted labels. */
export function MiniBars({ items, labelEvery = 1 }: MiniBarsProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-[120px] items-end gap-1">
        {items.map((item) => (
          <div key={item.key} title={item.tooltip} className="flex h-full flex-1 items-end">
            <div
              aria-hidden
              className="w-full bg-yellow transition-all duration-500"
              style={{ height: item.value > 0 ? `${Math.max(2, (item.value / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {items.map((item, i) => (
          <span
            key={item.key}
            className="flex-1 truncate text-center font-mono text-[9px] uppercase tracking-widest text-muted"
          >
            {i % labelEvery === 0 ? item.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
