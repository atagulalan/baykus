interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
}

/** ui.md primitives — reused across every 008 stat tile grid. */
export function StatTile({ label, value, sub }: StatTileProps) {
  return (
    <div className="flex flex-col items-center gap-3 border border-white/5 bg-[#101010] p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">{label}</p>
      <p className="font-display italic text-snow text-4xl leading-none tracking-tight">{value}</p>
      {sub && <p className="font-mono text-[10px] text-muted/70">{sub}</p>}
    </div>
  );
}
