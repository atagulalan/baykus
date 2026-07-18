import type { Play } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { SectionPill } from "../../atoms/SectionPill/SectionPill.tsx";

interface SectionHeaderProps {
  /** Leading category glyph (lucide component); omit for icon-less headers. */
  icon?: typeof Play | undefined;
  label: string;
  count: number;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
  /** Align to page content or to the padding used by list rows. */
  inset?: "page" | "list";
  /** When set, the label area becomes a toggle control (accordion sections). */
  onClick?: (() => void) | undefined;
  /** Pass with `onClick` for `aria-expanded`. */
  expanded?: boolean | undefined;
  /** Right-aligned controls (sort menu, remove button, …). */
  children?: ReactNode;
}

/**
 * Sticky centered pill header shared by the Library grid + Watch list surfaces:
 * icon · label · count · trailing controls. MainShell is always full-bleed:
 * `page` owns the standard screen inset, while `list` matches EpisodeRow.
 */
export function SectionHeader({
  icon: Icon,
  label,
  count,
  headingRef,
  inset = "page",
  onClick,
  expanded,
  children,
}: SectionHeaderProps) {
  const insetClass = inset === "list" ? "list-inset" : "px-3 sm:px-6";
  const pillPadding = onClick || children ? "split" : "default";

  const labelContent = (
    <>
      {Icon ? <Icon size={14} strokeWidth={1.75} className="shrink-0 text-muted" /> : null}
      <span className="min-w-0 truncate font-semibold text-sm text-snow">{label}</span>
      <span className="shrink-0 text-muted/35" aria-hidden>
        |
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{count}</span>
    </>
  );

  return (
    <div
      style={{
        top: "var(--app-header-height, 3.5rem)",
        scrollMarginTop: "var(--app-header-height, 3.5rem)",
      }}
      className={`sticky z-30 flex justify-center py-1 ${insetClass}`}
    >
      <SectionPill padding={pillPadding} {...(headingRef ? { headingRef } : {})}>
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            aria-expanded={expanded ?? true}
            className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors hover:bg-white/5 sm:px-3"
          >
            {labelContent}
          </button>
        ) : (
          labelContent
        )}
        {children ? (
          <div className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-2">
            {children}
          </div>
        ) : null}
      </SectionPill>
    </div>
  );
}
