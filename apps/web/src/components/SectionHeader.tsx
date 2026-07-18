import type { Play } from "lucide-react";
import type { ReactNode, Ref } from "react";

interface SectionHeaderProps {
  /** Leading category glyph (lucide component); omit for icon-less headers. */
  icon?: typeof Play | undefined;
  label: string;
  count: number;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
  /** Align to page content or to the padding used by list rows. */
  inset?: "page" | "list";
  /** Right-aligned controls (sort menu, remove button, …). */
  children?: ReactNode;
}

/**
 * Sticky section header shared by the Library grid + Watch list surfaces:
 * icon · label · count · trailing controls. MainShell is always full-bleed:
 * `page` owns the standard screen inset, while `list` matches EpisodeRow.
 */
export function SectionHeader({
  icon: Icon,
  label,
  count,
  headingRef,
  inset = "page",
  children,
}: SectionHeaderProps) {
  const insetClass = inset === "list" ? "px-2 sm:px-4" : "px-3 sm:px-6";

  return (
    <h2
      ref={headingRef}
      style={{
        top: "var(--app-header-height, 3.5rem)",
        scrollMarginTop: "var(--app-header-height, 3.5rem)",
      }}
      className={`sticky z-30 flex min-h-11 items-center gap-2 border-b border-white/5 bg-void/95 py-2.5 backdrop-blur ${insetClass}`}
    >
      {Icon ? <Icon size={16} strokeWidth={1.75} className="shrink-0 text-muted" /> : null}
      <span className="min-w-0 truncate font-semibold text-base text-snow">{label}</span>
      <span className="font-mono text-sm tabular-nums text-muted">({count})</span>
      {children ? <div className="ml-auto flex shrink-0 items-center gap-1">{children}</div> : null}
    </h2>
  );
}
