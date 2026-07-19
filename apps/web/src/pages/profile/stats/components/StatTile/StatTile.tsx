interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  /** Compact for the profile hub 3-up; default matches the stats page grids. */
  size?: "default" | "compact";
}

const SIZE = {
  default: {
    shell: "gap-3 rounded-md border border-white/10 bg-white/5 p-6",
    label: "text-xs",
    value: "text-4xl",
  },
  /** Profile hub — fill-only, no border. */
  compact: {
    shell: "gap-2 rounded-md bg-white/10 p-4",
    label: "text-[10px]",
    value: "text-2xl",
  },
} as const;

/** ui.md primitives — reused across every 008 stat tile grid + profile hub. */
export function StatTile({ label, value, sub, size = "default" }: StatTileProps) {
  const s = SIZE[size];
  return (
    <div className={`flex flex-col items-center text-center ${s.shell}`}>
      <p className={`font-mono uppercase tracking-widest text-muted ${s.label}`}>{label}</p>
      <p className={`font-display italic text-snow leading-none tracking-tight ${s.value}`}>
        {value}
      </p>
      {sub && <p className="font-mono text-[10px] text-muted-dim">{sub}</p>}
    </div>
  );
}
