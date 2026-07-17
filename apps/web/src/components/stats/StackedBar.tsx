interface StackedBarSegment {
  key: string;
  label: string;
  value: number;
  colorClass: string;
}

interface StackedBarProps {
  segments: StackedBarSegment[];
}

/** ui.md primitive: flex segments (zero-count skipped) + a legend that keeps every segment. */
export function StackedBar({ segments }: StackedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 gap-[2px] overflow-hidden">
        {visible.map((s) => (
          <div
            key={s.key}
            aria-hidden
            title={`${s.label}: ${s.value}`}
            className={s.colorClass}
            style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted"
          >
            <span aria-hidden className={`h-2 w-2 shrink-0 ${s.colorClass}`} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}
