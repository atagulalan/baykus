import type { Play } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { SectionPill } from "../../atoms/SectionPill/SectionPill.tsx";

interface SectionHeaderProps {
  /** Leading category glyph (lucide component); omit for icon-less headers. */
  icon?: typeof Play | undefined;
  /** Custom leading node (e.g. circular progress); wins over `icon`. */
  leading?: ReactNode;
  label: string;
  /** Plain tally, or a `watched/total` ratio for progress-bearing sections. */
  count: number | string;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
  /** Align to page content or to the padding used by list rows. */
  inset?: "page" | "list";
  /** When set, the label area becomes a toggle control (accordion sections). */
  onClick?: (() => void) | undefined;
  /** Pass with `onClick` for `aria-expanded`. */
  expanded?: boolean | undefined;
  /** Control rendered beside the pill (e.g. a section overflow menu), centred with it. */
  action?: ReactNode;
}

/**
 * Sticky centered pill header shared by the Library grid + Watch list surfaces:
 * icon · label · count. MainShell is always full-bleed: `page` owns the standard
 * screen inset, while `list` matches EpisodeRow.
 */
export function SectionHeader({
  icon: Icon,
  leading,
  label,
  count,
  headingRef,
  inset = "page",
  onClick,
  expanded,
  action,
}: SectionHeaderProps) {
  const insetClass = inset === "list" ? "list-inset" : "px-3 sm:px-6";
  const pillPadding = onClick ? "splitLabel" : "default";

  const leadingNode =
    leading ??
    (Icon ? <Icon size={14} strokeWidth={1.75} className="shrink-0 text-muted" /> : null);

  const labelContent = (
    <>
      {leadingNode}
      <span className="min-w-0 truncate font-semibold text-sm text-snow">{label}</span>
      <span className="shrink-0 text-muted/35" aria-hidden>
        |
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{count}</span>
    </>
  );

  const labelButtonClass =
    "inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full -mx-2.5 px-2.5 py-1 transition-colors hover:bg-white/5 sm:-mx-3 sm:px-3";

  return (
    <div
      style={{
        top: "var(--app-header-height, 3.5rem)",
        scrollMarginTop: "var(--app-header-height, 3.5rem)",
      }}
      className={`sticky z-30 flex items-center justify-center gap-1 py-1 ${insetClass}`}
    >
      <SectionPill padding={pillPadding} {...(headingRef ? { headingRef } : {})}>
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            aria-expanded={expanded ?? true}
            className={labelButtonClass}
          >
            {labelContent}
          </button>
        ) : (
          labelContent
        )}
      </SectionPill>
      {action}
    </div>
  );
}
